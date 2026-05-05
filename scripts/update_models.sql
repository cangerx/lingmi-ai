-- ═══════════════════════════════════════════════════════
-- 更新现有图像模型：添加描述、标签
-- ═══════════════════════════════════════════════════════

UPDATE models SET display_name='GPT-4o Image', description='OpenAI 最新图像生成模型，基于 GPT-4o 架构，支持文字渲染、复杂构图和高度指令遵循，画质精细、细节丰富，擅长海报设计和商业图片生成', badge='Hot', tags='["推荐","文字渲染","高清"]', sort=1 WHERE name='gpt-image-2';

UPDATE models SET display_name='GPT Image 1', description='OpenAI 第一代原生图像生成模型，生成速度快，适合快速原型和概念探索', tags='["旧版"]', sort=10 WHERE name='gpt-image-1';

UPDATE models SET display_name='DALL·E 3', description='OpenAI 经典图像生成模型，擅长创意插画、概念艺术和抽象风格，与 ChatGPT 深度集成，理解长文本描述', tags='["经典","创意"]', sort=5 WHERE name='dall-e-3';

UPDATE models SET display_name='Imagen 3', description='Google DeepMind 最新图像生成模型，照片级真实感出色，色彩还原度高，支持多语言提示词，擅长风景、人像和产品摄影', badge='New', tags='["真实感","多语言"]', sort=3 WHERE name='imagen-3.0-generate-002';

UPDATE models SET display_name='Gemini 2.0 Flash', description='Google 多模态模型的图像生成能力，速度极快，支持图文混合理解和生成，性价比高', tags='["快速","多模态"]', sort=6 WHERE name='gemini-2.0-flash';

-- ═══════════════════════════════════════════════════════
-- 新增最新图像模型
-- ═══════════════════════════════════════════════════════

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('flux-1.1-pro', 'FLUX 1.1 Pro', 'image', 'Black Forest Labs 旗舰图像模型，开源社区最强文生图之一。生成速度快、画质极高，擅长写实摄影、商业海报和创意设计，支持多种宽高比', 'black-forest-labs', 'per_call', 3, 'Hot', '["开源","高画质","推荐"]', '[{"name":"1.1 Pro","model":"flux-1.1-pro"},{"name":"1.0 Pro","model":"flux-pro","tag":"旧版"}]', 2, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('flux-1.1-pro-ultra', 'FLUX 1.1 Pro Ultra', 'image', 'FLUX Pro 的超高清版本，支持生成高达 4MP (2048×2048) 分辨率图像，细节更丰富，适合印刷级品质需求', 'black-forest-labs', 'per_call', 5, 'Pro', '["超高清","4K","印刷级"]', '[]', 4, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('midjourney-v6.1', 'Midjourney v6.1', 'image', 'Midjourney 最新版本，业界公认的艺术感最强模型。擅长电影级构图、光影氛围和美学表现，生成图片极具艺术价值，适合创意设计和视觉艺术', 'midjourney', 'per_call', 8, 'Pro', '["艺术感","电影级","美学"]', '[{"name":"v6.1","model":"midjourney-v6.1"},{"name":"v6.0","model":"midjourney-v6","tag":"旧版"}]', 7, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('stable-diffusion-3.5-large', 'SD 3.5 Large', 'image', 'Stability AI 最新开源大模型，80亿参数，支持文字渲染和复杂构图，在开源社区表现优异，适合需要本地部署和二次开发的场景', 'stability-ai', 'per_call', 2, '', '["开源","文字渲染"]', '[{"name":"3.5 Large","model":"stable-diffusion-3.5-large"},{"name":"3.5 Medium","model":"stable-diffusion-3.5-medium"}]', 8, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('ideogram-v3', 'Ideogram v3', 'image', 'Ideogram 最新模型，文字渲染能力业界领先，能在图像中精确生成中英文文字、Logo 和标语，非常适合海报、名片和品牌设计', 'ideogram', 'per_call', 4, 'New', '["文字渲染最强","Logo设计","推荐"]', '[{"name":"v3","model":"ideogram-v3"},{"name":"v2","model":"ideogram-v2","tag":"旧版"}]', 9, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('recraft-v3', 'Recraft V3', 'image', 'Recraft 最新模型（曾登顶 ELO 排行榜），擅长矢量风格、品牌设计和商业插画，支持生成 SVG 矢量图，是设计师的专业工具', 'recraft', 'per_call', 4, 'New', '["矢量图","品牌设计","设计师工具"]', '[]', 11, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('kolors-v1.5', 'Kolors 1.5', 'image', '快手可图最新版本，中文理解能力最强的图像模型，深度理解中国文化元素和审美，擅长国潮风格、中式设计和中文排版', 'kuaishou', 'per_call', 1, '', '["中文最强","国潮","免费"]', '[]', 12, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, tags=EXCLUDED.tags, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('playground-v3', 'Playground v3', 'image', 'Playground AI 最新模型，专注于美学和设计感，生成图片具有天然的设计排版能力，特别适合社交媒体内容和品牌素材', 'playground', 'per_call', 2, '', '["美学","设计感","社交媒体"]', '[]', 13, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, tags=EXCLUDED.tags, sort=EXCLUDED.sort, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('jimeng-2.1', '即梦 2.1', 'image', '字节跳动即梦最新图像模型，中文场景理解出色，生成速度快，擅长人像美化、电商场景和社交内容，价格亲民', 'bytedance', 'per_call', 1, 'New', '["中文","快速","电商"]', '[{"name":"2.1","model":"jimeng-2.1"},{"name":"2.0","model":"jimeng-2.0","tag":"旧版"}]', 14, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, versions=EXCLUDED.versions, sort=EXCLUDED.sort, updated_at=NOW();
