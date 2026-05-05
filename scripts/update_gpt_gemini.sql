-- ═══════════════════════════════════════════════════════
-- 更新 GPT 系列模型
-- ═══════════════════════════════════════════════════════

UPDATE models SET display_name='GPT-4o Image', description='OpenAI 最强图像生成模型，基于 GPT-4o 原生多模态架构。支持精准文字渲染（中英文均可）、复杂多主体构图、指令高度遵循。画质细腻、光影自然，擅长海报设计、产品图、UI 设计稿和带文字的商业图片。支持透明背景和图像编辑。', badge='Hot', tags='["推荐","文字渲染","高清","透明背景","图像编辑"]', price_per_call=5, sort=1 WHERE name='gpt-image-2';

UPDATE models SET display_name='GPT Image 1', description='OpenAI 第一代原生图像模型（基于 GPT-4o 早期版本）。生成速度快、成本低，适合快速原型验证和批量概念探索。画质略低于最新版，但性价比极高。', badge='', tags='["性价比","快速"]', price_per_call=2, sort=10 WHERE name='gpt-image-1';

UPDATE models SET display_name='DALL·E 3', description='OpenAI 经典图像生成模型，与 ChatGPT 深度集成。擅长创意插画、概念艺术、抽象风格和场景叙事。对长文本描述理解力强，能将复杂创意精准转化为图像。不支持文字渲染和透明背景。', badge='', tags='["创意","插画","经典"]', price_per_call=2, sort=11 WHERE name='dall-e-3';

-- ═══════════════════════════════════════════════════════
-- 更新 Google 系列模型
-- ═══════════════════════════════════════════════════════

UPDATE models SET display_name='Imagen 3', description='Google DeepMind 旗舰图像生成模型。照片级真实感业界领先，色彩还原度极高，细节纹理逼真。支持多语言提示词（含中文），擅长风景摄影、人像写真、产品摄影和建筑设计可视化。Gemini API 原生集成。', badge='Hot', tags='["真实感","多语言","Google","摄影级"]', price_per_call=3, sort=2 WHERE name='imagen-3.0-generate-002';

UPDATE models SET display_name='Gemini 2.0 Flash', description='Google Gemini 2.0 多模态模型的原生图像生成能力。速度极快（秒级出图），支持图文混合理解、以图生图、图像编辑。性价比最高的多模态图像模型，适合快速迭代和批量生成。', badge='', tags='["极速","多模态","免费","以图生图"]', price_per_call=0, sort=5 WHERE name='gemini-2.0-flash';

-- 新增 Gemini 2.5 系列
INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('gemini-2.5-flash-preview', 'Gemini 2.5 Flash', 'image', 'Google 最新一代多模态模型，思维推理能力大幅提升。图像生成质量显著优于 2.0 版本，构图更精准、细节更丰富、文字渲染能力增强。保持极快生成速度的同时，画质接近 Imagen 3 水平。支持复杂场景理解和多轮图像对话编辑。', 'google', 'per_call', 1, 'New', '["最新","推荐","快速","高画质","思维推理"]', '[{"name":"2.5 Flash","model":"gemini-2.5-flash-preview"},{"name":"2.0 Flash","model":"gemini-2.0-flash","tag":"旧版"}]', 3, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, price_per_call=EXCLUDED.price_per_call, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('gemini-2.5-pro-preview', 'Gemini 2.5 Pro', 'image', 'Google 最强多模态旗舰模型。综合能力最强，图像生成画质最高，复杂指令遵循度极高。支持超长上下文（100万 token）的图文混合理解，能根据详细描述生成高度精准的图像。适合专业设计、高品质商业图片和复杂创意需求。', 'google', 'per_call', 4, 'Pro', '["旗舰","最强画质","专业","长上下文"]', '[{"name":"2.5 Pro","model":"gemini-2.5-pro-preview"}]', 4, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, price_per_call=EXCLUDED.price_per_call, updated_at=NOW();
