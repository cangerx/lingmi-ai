-- 新增 Gemini 3 系列图像模型
INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('gemini-3-pro-image-preview', 'Gemini 3 Pro Image', 'image', 'Google 最强图像生成模型，专为专业资产制作而设计。利用高级推理（"思考"）功能来遵循复杂的指令并呈现高保真文本，画质业界顶级，适合专业设计和商业图片。', 'google', 'per_call', 5, 'Hot', '["最新","旗舰","专业","思考推理","高保真"]', '[]', 1, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, sort=EXCLUDED.sort, price_per_call=EXCLUDED.price_per_call, updated_at=NOW();

INSERT INTO models (name, display_name, type, description, provider, pricing_mode, price_per_call, badge, tags, versions, sort, status, created_at, updated_at) VALUES ('gemini-3.1-flash-image-preview', 'Gemini 3.1 Flash Image', 'image', 'Gemini 3 Pro Image 的高效率版本，针对速度和高用量开发者使用情形进行了优化。生成速度极快，画质接近 Pro 版本，性价比极高，适合批量生成和快速迭代。', 'google', 'per_call', 2, 'New', '["最新","高速","高性价比","批量生成"]', '[]', 2, 'active', NOW(), NOW()) ON CONFLICT (name) DO UPDATE SET display_name=EXCLUDED.display_name, description=EXCLUDED.description, badge=EXCLUDED.badge, tags=EXCLUDED.tags, sort=EXCLUDED.sort, price_per_call=EXCLUDED.price_per_call, updated_at=NOW();

-- 更新 Gemini 2.5 Flash Image
UPDATE models SET name='gemini-2.5-flash-image', display_name='Gemini 2.5 Flash Image', description='Gemini 2.5 Flash 图像模型，专为速度和效率而设计，经过优化可处理海量低延迟任务。性价比高，免费额度充足，适合日常使用和快速原型。', badge='', tags='["免费","高速","低延迟"]', sort=5 WHERE name='gemini-2.5-flash-preview';

-- 更新旧 Gemini 2.5 Pro 排序
UPDATE models SET sort=6, badge='' WHERE name='gemini-2.5-pro-preview';

-- 更新旧 Gemini 2.0 Flash 排序
UPDATE models SET sort=8, description='Google Gemini 2.0 多模态模型，支持图文混合理解、以图生图。已有更新版本可用，但仍可免费使用。', tags='["免费","旧版"]' WHERE name='gemini-2.0-flash';

-- 更新 Imagen 3 排序
UPDATE models SET sort=7 WHERE name='imagen-3.0-generate-002';

-- 更新 GPT Image 2 排序（保持前列）
UPDATE models SET sort=3 WHERE name='gpt-image-2';
UPDATE models SET sort=12 WHERE name='gpt-image-1';
UPDATE models SET sort=13 WHERE name='dall-e-3';
