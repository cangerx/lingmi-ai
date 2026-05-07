package service

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"log"
	mrand "math/rand"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/lingmiai/server/internal/config"
	"github.com/lingmiai/server/internal/model"
)

// TianquePaymentProvider implements PaymentProvider for 随行付
type TianquePaymentProvider struct {
	Cfg     config.TianqueConfig
	privKey *rsa.PrivateKey
}

// NewTianquePaymentProvider creates and initializes a Tianque payment provider
func NewTianquePaymentProvider(cfg config.TianqueConfig) (*TianquePaymentProvider, error) {
	privKey, err := loadTianquePrivateKey(cfg.PrivateKey)
	if err != nil {
		return nil, fmt.Errorf("load tianque private key: %w", err)
	}
	if cfg.Version == "" {
		cfg.Version = "1.2"
	}
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://openapi-test.tianquetech.com"
	}
	return &TianquePaymentProvider{Cfg: cfg, privKey: privKey}, nil
}

func (t *TianquePaymentProvider) Name() string { return "tianque" }

// CreatePayment creates a payment order via 随行付主扫/预下单 API
func (t *TianquePaymentProvider) CreatePayment(order *model.Order) (*PayResult, error) {
	reqData := newOrderedMap()
	reqData.Set("mno", t.Cfg.Mno)
	reqData.Set("ordNo", order.OrderNo)
	reqData.Set("amt", fmt.Sprintf("%.2f", order.Amount))
	reqData.Set("subject", fmt.Sprintf("灵觅AI充值 %.0f积分", order.Credits))
	reqData.Set("trmIp", "127.0.0.1")
	if t.Cfg.NotifyURL != "" {
		reqData.Set("notifyUrl", t.Cfg.NotifyURL)
	}

	resp, err := t.doRequest("/order/activePlusScan", reqData)
	if err != nil {
		return nil, err
	}

	respData, ok := resp["respData"].(map[string]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid response: missing respData")
	}

	bizCode, _ := respData["bizCode"].(string)
	if bizCode != "0000" {
		bizMsg, _ := respData["bizMsg"].(string)
		return nil, fmt.Errorf("随行付下单失败: bizCode=%s bizMsg=%s", bizCode, bizMsg)
	}

	payURL, _ := respData["payUrl"].(string)
	uuid, _ := respData["uuid"].(string)

	return &PayResult{
		PayURL:   payURL,
		PrepayID: uuid,
		ExpireAt: time.Now().Add(30 * time.Minute).Format(time.RFC3339),
	}, nil
}

// QueryPayment queries payment status via 随行付交易查询 API
func (t *TianquePaymentProvider) QueryPayment(orderNo string) (bool, error) {
	reqData := newOrderedMap()
	reqData.Set("mno", t.Cfg.Mno)
	reqData.Set("ordNo", orderNo)

	resp, err := t.doRequest("/query/tradeQuery", reqData)
	if err != nil {
		return false, err
	}

	respData, ok := resp["respData"].(map[string]interface{})
	if !ok {
		return false, fmt.Errorf("invalid response: missing respData")
	}

	bizCode, _ := respData["bizCode"].(string)
	if bizCode != "0000" {
		bizMsg, _ := respData["bizMsg"].(string)
		return false, fmt.Errorf("查询失败: bizCode=%s bizMsg=%s", bizCode, bizMsg)
	}

	tranSts, _ := respData["tranSts"].(string)
	return tranSts == "SUCCESS", nil
}

// HandleNotify handles 随行付 payment callback notification
func (t *TianquePaymentProvider) HandleNotify(body []byte) (string, bool, error) {
	var resp map[string]interface{}
	if err := json.Unmarshal(body, &resp); err != nil {
		return "", false, fmt.Errorf("parse notify body: %w", err)
	}

	log.Printf("[Tianque] Notify received: %s", string(body))

	code, _ := resp["code"].(string)
	if code != "0000" {
		msg, _ := resp["msg"].(string)
		return "", false, fmt.Errorf("notify code=%s msg=%s", code, msg)
	}

	respData, ok := resp["respData"].(map[string]interface{})
	if !ok {
		return "", false, fmt.Errorf("invalid notify: missing respData")
	}

	bizCode, _ := respData["bizCode"].(string)
	ordNo, _ := respData["ordNo"].(string)
	tranSts, _ := respData["tranSts"].(string)

	if bizCode == "0000" && tranSts == "SUCCESS" {
		return ordNo, true, nil
	}

	return ordNo, false, nil
}

// doRequest builds, signs, and sends a request to 随行付 API
func (t *TianquePaymentProvider) doRequest(path string, reqData *orderedMap) (map[string]interface{}, error) {
	reqID := generateReqID()

	params := newOrderedMap()
	params.Set("signType", "RSA")
	params.Set("version", t.Cfg.Version)
	params.Set("orgId", t.Cfg.OrgID)
	params.Set("reqId", reqID)
	params.Set("timestamp", time.Now().Format("20060102150405"))
	params.Set("reqData", reqData)

	signStr := buildTianqueSignString(params)
	signature, err := tianqueSign(signStr, t.privKey)
	if err != nil {
		return nil, fmt.Errorf("sign request: %w", err)
	}
	params.Set("sign", signature)

	bodyJSON, _ := json.Marshal(params.ToMap())

	url := strings.TrimRight(t.Cfg.BaseURL, "/") + path
	log.Printf("[Tianque] POST %s body=%s", url, string(bodyJSON))

	httpReq, err := http.NewRequest("POST", url, strings.NewReader(string(bodyJSON)))
	if err != nil {
		return nil, err
	}
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("tianque request: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)
	log.Printf("[Tianque] Response status=%d body=%s", resp.StatusCode, string(respBody))

	var result map[string]interface{}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	code, _ := result["code"].(string)
	if code != "0000" {
		msg, _ := result["msg"].(string)
		return nil, fmt.Errorf("随行付接口错误: code=%s msg=%s", code, msg)
	}

	return result, nil
}

// ---------- Signature helpers ----------

func loadTianquePrivateKey(keyStr string) (*rsa.PrivateKey, error) {
	keyStr = strings.TrimSpace(keyStr)

	// If it doesn't look like PEM, wrap it
	if !strings.Contains(keyStr, "-----BEGIN") {
		keyStr = "-----BEGIN PRIVATE KEY-----\n" + keyStr + "\n-----END PRIVATE KEY-----"
	}

	block, _ := pem.Decode([]byte(keyStr))
	if block == nil {
		return nil, fmt.Errorf("PEM decode failed")
	}

	// Try PKCS8 first
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		// Fallback to PKCS1
		rsaKey, err2 := x509.ParsePKCS1PrivateKey(block.Bytes)
		if err2 != nil {
			return nil, fmt.Errorf("parse private key failed (PKCS8: %v, PKCS1: %v)", err, err2)
		}
		return rsaKey, nil
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("not an RSA private key")
	}
	return rsaKey, nil
}

// buildTianqueSignString builds the sign string according to 随行付 spec:
// - Exclude sign field, null, empty string (keep 0)
// - Sort outer keys alphabetically
// - reqData keeps code-definition order (use orderedMap), compact JSON, no unicode escape
func buildTianqueSignString(params *orderedMap) string {
	keys := make([]string, 0)
	for _, k := range params.Keys() {
		if k == "sign" {
			continue
		}
		v := params.Get(k)
		if v == nil {
			continue
		}
		if s, ok := v.(string); ok && s == "" {
			continue
		}
		keys = append(keys, k)
	}
	sort.Strings(keys)

	parts := make([]string, 0, len(keys))
	for _, k := range keys {
		v := params.Get(k)
		var str string
		if om, ok := v.(*orderedMap); ok {
			str = om.ToJSON()
		} else {
			str = fmt.Sprintf("%v", v)
		}
		parts = append(parts, fmt.Sprintf("%s=%s", k, str))
	}
	return strings.Join(parts, "&")
}

func tianqueSign(signString string, privKey *rsa.PrivateKey) (string, error) {
	hashed := sha1.Sum([]byte(signString))
	sig, err := rsa.SignPKCS1v15(rand.Reader, privKey, crypto.SHA1, hashed[:])
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(sig), nil
}

func generateReqID() string {
	src := mrand.New(mrand.NewSource(time.Now().UnixNano()))
	id := fmt.Sprintf("%x%x", time.Now().UnixNano(), src.Int63())
	if len(id) > 32 {
		id = id[:32]
	}
	for len(id) < 32 {
		id += "0"
	}
	return id
}

// ---------- orderedMap: preserves insertion order for reqData ----------

type orderedMap struct {
	keys   []string
	values map[string]interface{}
}

func newOrderedMap() *orderedMap {
	return &orderedMap{
		keys:   make([]string, 0),
		values: make(map[string]interface{}),
	}
}

func (m *orderedMap) Set(key string, value interface{}) {
	if _, exists := m.values[key]; !exists {
		m.keys = append(m.keys, key)
	}
	m.values[key] = value
}

func (m *orderedMap) Get(key string) interface{} {
	return m.values[key]
}

func (m *orderedMap) Keys() []string {
	return m.keys
}

// ToJSON outputs compact JSON preserving key order, no unicode escape
func (m *orderedMap) ToJSON() string {
	parts := make([]string, 0, len(m.keys))
	for _, k := range m.keys {
		v := m.values[k]
		keyJSON, _ := json.Marshal(k)
		var valJSON string
		switch val := v.(type) {
		case *orderedMap:
			valJSON = val.ToJSON()
		case string:
			valJSON = `"` + escapeJSONString(val) + `"`
		default:
			b, _ := json.Marshal(val)
			valJSON = string(b)
		}
		parts = append(parts, string(keyJSON)+":"+valJSON)
	}
	return "{" + strings.Join(parts, ",") + "}"
}

// ToMap converts to regular map (for final JSON marshal)
func (m *orderedMap) ToMap() map[string]interface{} {
	result := make(map[string]interface{})
	for _, k := range m.keys {
		v := m.values[k]
		if om, ok := v.(*orderedMap); ok {
			result[k] = json.RawMessage(om.ToJSON())
		} else {
			result[k] = v
		}
	}
	return result
}

func escapeJSONString(s string) string {
	b, _ := json.Marshal(s)
	// Remove surrounding quotes
	return string(b[1 : len(b)-1])
}
