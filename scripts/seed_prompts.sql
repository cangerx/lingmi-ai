-- 为所有模板添加 AI 提示词 (prompt + prompt_en + model_used)
-- 先确保字段已迁移

-- ═══ 电商 ═══
UPDATE templates SET prompt='红色喜庆618大促电商主图，大字标题"618狂欢价"，商品展示区域，限时折扣标签，光效粒子背景，高转化营销设计', prompt_en='E-commerce product main image for 618 sale, bold red festive style, large title text "618 Sale", product showcase area, limited-time discount badge, particle light effects background, high-conversion marketing design, professional product photography, 4K', model_used='flux-pro' WHERE title='618大促爆款主图' AND prompt IS NULL OR prompt='';

UPDATE templates SET prompt='紫色渐变双十一购物节促销海报，霓虹灯光效，"双11全球狂欢节"主标题，倒计时元素，购物车图标，潮流设计风格', prompt_en='Purple gradient Double 11 shopping festival promotional poster, neon light effects, main title "Double 11 Global Shopping Festival", countdown timer element, shopping cart icon, trendy design style, vibrant colors, 4K', model_used='flux-pro' WHERE title='双11狂欢购物节' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='简约白底新品上市电商主图，产品居中展示，"新品首发"文字标签，清爽干净布局，品质感光影，极简设计风格', prompt_en='Minimalist white background new product launch e-commerce main image, centered product display, "New Arrival" text label, clean and fresh layout, quality lighting and shadow, minimalist design style, 4K', model_used='flux-pro' WHERE title='新品上市促销图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='限时秒杀倒计时电商海报，红色急迫感配色，闪电元素，大号倒计时数字，"限时秒杀"醒目标题，动感设计', prompt_en='Flash sale countdown e-commerce poster, urgent red color scheme, lightning bolt elements, large countdown numbers, bold "Flash Sale" title, dynamic energetic design, 4K', model_used='flux-pro' WHERE title='限时秒杀海报' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='满减优惠活动电商促销图，金色与红色搭配，优惠券样式元素，"满300减50"突出显示，喜庆热销氛围', prompt_en='Full reduction promotion e-commerce image, gold and red color combination, coupon style elements, "Save $50 on $300+" prominently displayed, festive hot-selling atmosphere, 4K', model_used='flux-pro' WHERE title='满减优惠活动图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='直通车推广电商主图，白色简洁背景，产品特写展示，卖点文字标注，点击引导箭头，高点击率设计', prompt_en='E-commerce paid promotion main image, white clean background, product close-up showcase, selling point text annotations, click-through arrow guides, high CTR design, 4K', model_used='flux-pro' WHERE title='直通车推广主图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='店铺首页横幅banner，品牌色渐变背景，多产品陈列展示，"品牌日"主题文字，优雅排版布局', prompt_en='Store homepage banner, brand color gradient background, multi-product display arrangement, "Brand Day" theme text, elegant typography layout, wide format, 4K', model_used='flux-pro' WHERE title='店铺首页横幅' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='产品详情页头图设计，场景化产品展示，生活方式背景，品牌调性统一，精致光影效果，高端质感', prompt_en='Product detail page header design, lifestyle product photography, ambient background scene, consistent brand identity, refined lighting effects, premium quality feel, 4K', model_used='flux-pro' WHERE title='详情页头图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='白底产品展示图，纯白背景，产品360度展示，柔和阴影，干净利落的商品摄影风格，专业级产品图', prompt_en='White background product showcase, pure white backdrop, 360-degree product display, soft shadow, clean and sharp commercial photography style, professional product image, 4K', model_used='flux-pro' WHERE title='产品展示白底图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='促销活动海报设计，撞色对比背景，爆炸贴元素，价格标签突出，"年中大促"主题，视觉冲击力强', prompt_en='Promotional event poster design, contrasting color background, starburst elements, prominent price tags, "Mid-year Sale" theme, strong visual impact, 4K', model_used='flux-pro' WHERE title='促销活动海报' AND (prompt IS NULL OR prompt='');

-- ═══ 社交媒体 ═══
UPDATE templates SET prompt='小红书美食探店封面图，粉色系少女风配色，美食特写照片区域，手写体标题"今日探店"，贴纸装饰元素，ins风排版', prompt_en='Xiaohongshu food review cover, pink girly color scheme, food close-up photo area, handwritten title "Today''s Food Trip", sticker decoration elements, Instagram-style layout, 4K', model_used='flux-pro' WHERE title='小红书美食探店' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='ins风穿搭日记封面，极简白色背景，全身穿搭照片展示区，优雅衬线字体标题，米色与奶茶色调，时尚杂志排版', prompt_en='Instagram-style outfit diary cover, minimalist white background, full-body outfit photo display area, elegant serif font title, beige and milk tea tones, fashion magazine layout, 4K', model_used='flux-pro' WHERE title='ins风穿搭日记' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='旅行打卡攻略封面图，蓝色天空渐变背景，地标建筑轮廓元素，地图标记图标，"旅行攻略"手写标题，清新文艺风', prompt_en='Travel check-in guide cover, blue sky gradient background, landmark building silhouette elements, map pin icons, handwritten "Travel Guide" title, fresh artistic style, 4K', model_used='flux-pro' WHERE title='旅行打卡攻略' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='健身运动记录打卡图，深色运动风背景，运动数据展示区域，肌肉线条元素，"今日训练"醒目标题，活力橙色强调色', prompt_en='Fitness workout tracking card, dark sporty background, workout data display area, muscle line art elements, bold "Today''s Workout" title, energetic orange accent color, 4K', model_used='flux-pro' WHERE title='健身运动记录' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='好物测评对比图模板，左右分栏对比布局，产品照片展示区，星级评分元素，"真实测评"标题，清爽绿色配色', prompt_en='Product review comparison template, side-by-side comparison layout, product photo display areas, star rating elements, "Honest Review" title, fresh green color scheme, 4K', model_used='flux-pro' WHERE title='好物测评分享' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='护肤心得笔记封面，水润通透感背景，护肤品瓶身展示区，水滴和光泽元素，"护肤日记"优雅标题，清透白绿配色', prompt_en='Skincare routine notes cover, dewy translucent background, skincare bottle display area, water droplet and glossy elements, elegant "Skincare Diary" title, clear white-green color scheme, 4K', model_used='flux-pro' WHERE title='护肤心得笔记' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='宠物日常分享封面图，可爱卡通边框装饰，宠物照片展示区域，爪印元素点缀，"毛孩子日常"趣味标题，暖黄色调', prompt_en='Pet daily sharing cover, cute cartoon frame decoration, pet photo display area, paw print element accents, playful "Pet Daily" title, warm yellow tone, 4K', model_used='flux-pro' WHERE title='宠物日常分享' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='家居改造对比记录图，before/after分屏布局，房间照片展示区，箭头过渡元素，"改造记录"简约标题，北欧风配色', prompt_en='Home makeover before/after record, split-screen layout, room photo display area, arrow transition elements, minimalist "Makeover Log" title, Scandinavian color scheme, 4K', model_used='flux-pro' WHERE title='家居改造记录' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='读书笔记打卡封面，翻开的书本元素，纸质纹理背景，手写体引用文字区域，书签装饰，文艺米色调', prompt_en='Reading notes check-in cover, open book elements, paper texture background, handwritten quote text area, bookmark decoration, literary beige tone, 4K', model_used='flux-pro' WHERE title='读书笔记打卡' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='咖啡探店日记封面，拿铁拉花特写区域，咖啡豆散落装饰，棕色温暖色调，"咖啡日记"手写标题，复古胶片风格', prompt_en='Coffee shop review diary cover, latte art close-up area, scattered coffee bean decorations, warm brown tones, handwritten "Coffee Diary" title, vintage film style, 4K', model_used='flux-pro' WHERE title='咖啡探店日记' AND (prompt IS NULL OR prompt='');

-- ═══ 微信营销 ═══
UPDATE templates SET prompt='朋友圈产品宣传图，高端大气深色背景，产品居中突出展示，金色点缀元素，品牌logo区域，简洁有力的卖点文案区', prompt_en='WeChat Moments product promotion image, premium dark background, centered prominent product display, gold accent elements, brand logo area, concise and powerful selling point copy area, 4K', model_used='flux-pro' WHERE title='朋友圈产品宣传' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='社群裂变活动海报，红色紧迫感背景，扫码区域突出展示，"限时免费"大字标题，倒计时元素，利益点清晰排列', prompt_en='Community viral campaign poster, urgent red background, prominent QR code scan area, large "Limited Free" title, countdown element, clearly arranged benefit points, 4K', model_used='flux-pro' WHERE title='社群裂变海报' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='节日祝福电子贺卡，温馨暖色调背景，精美花卉装饰边框，祝福语文字居中，星光粒子点缀，优雅高级感设计', prompt_en='Holiday greeting e-card, warm tone background, exquisite floral decorative frame, centered blessing text, starlight particle accents, elegant premium design, 4K', model_used='flux-pro' WHERE title='节日祝福贺卡' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='活动邀请函设计，金色与白色高级配色，精致边框装饰，活动时间地点信息区，"诚邀莅临"优雅标题，正式商务风格', prompt_en='Event invitation design, premium gold and white color scheme, delicate frame decoration, event time and location info area, elegant "Cordially Invited" title, formal business style, 4K', model_used='flux-pro' WHERE title='活动邀请函' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='早安问候日签图，清新日出渐变背景，励志文字居中排版，日期星期显示，植物叶子装饰元素，舒适治愈风格', prompt_en='Good morning daily greeting card, fresh sunrise gradient background, centered motivational text layout, date and day display, plant leaf decoration elements, comfortable healing style, 4K', model_used='flux-pro' WHERE title='早安问候日签' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='晚安治愈语录图，深蓝色星空夜晚背景，月亮星星元素，温柔治愈系文字，柔和光晕效果，宁静安详氛围', prompt_en='Good night healing quote card, deep blue starry night background, moon and star elements, gentle healing text, soft glow effect, peaceful serene atmosphere, 4K', model_used='flux-pro' WHERE title='晚安治愈语录' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='开业活动宣传海报，红色金色喜庆配色，鞭炮彩带装饰元素，"盛大开业"大字标题，优惠信息展示区，热闹欢庆氛围', prompt_en='Grand opening promotional poster, festive red and gold color scheme, firecrackers and ribbon decorations, large "Grand Opening" title, discount info display area, lively celebration atmosphere, 4K', model_used='flux-pro' WHERE title='开业活动海报' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='中秋节祝福贺卡，圆月与玉兔元素，传统国潮祥云纹样，金色月饼装饰，"中秋快乐"书法字体，深蓝紫色夜空背景', prompt_en='Mid-Autumn Festival greeting card, full moon and jade rabbit elements, traditional Chinese auspicious cloud patterns, golden mooncake decoration, "Happy Mid-Autumn" calligraphy font, deep blue-purple night sky background, 4K', model_used='flux-pro' WHERE title='中秋节祝福' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='春节拜年贺卡设计，大红色喜庆背景，福字灯笼元素，烟花爆竹装饰，"恭贺新禧"金色书法标题，传统剪纸风格', prompt_en='Chinese New Year greeting card design, bright red festive background, blessing character lantern elements, firework decorations, golden calligraphy "Happy New Year" title, traditional paper-cut style, 4K', model_used='flux-pro' WHERE title='春节拜年贺卡' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='母亲节感恩贺卡，粉色渐变温馨背景，康乃馨花束元素，爱心装饰点缀，"感恩母亲"温暖标题，柔美优雅风格', prompt_en='Mother''s Day gratitude card, warm pink gradient background, carnation bouquet elements, heart decoration accents, warm "Thank You Mom" title, soft elegant style, 4K', model_used='flux-pro' WHERE title='母亲节感恩贺卡' AND (prompt IS NULL OR prompt='');

-- ═══ 公众号 ═══
UPDATE templates SET prompt='科技资讯公众号首图，深蓝色科技感背景，电路板纹理元素，数据可视化图形，"科技前沿"醒目标题，未来感设计', prompt_en='Tech news WeChat article header, deep blue tech-feel background, circuit board texture elements, data visualization graphics, bold "Tech Frontier" title, futuristic design, 900x383, 4K', model_used='flux-pro' WHERE title='科技资讯首图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='美食推荐公众号首图，暖色调美食摄影背景，食物特写展示区，"今日推荐"手写标题，烟雾热气效果，食欲感设计', prompt_en='Food recommendation article header, warm-toned food photography background, food close-up showcase area, handwritten "Today''s Pick" title, steam and smoke effects, appetizing design, 900x383, 4K', model_used='flux-pro' WHERE title='美食推荐首图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='教育培训招生公众号首图，蓝色专业背景，学术帽书本元素，"招生进行中"突出标题，信任感专业排版', prompt_en='Education enrollment article header, professional blue background, graduation cap and book elements, prominent "Enrollment Open" title, trustworthy professional layout, 900x383, 4K', model_used='flux-pro' WHERE title='教育培训首图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='旅游攻略公众号首图，蓝天白云风景背景，飞机地标剪影元素，行李箱图标，"旅行指南"活力标题，清新蓝色调', prompt_en='Travel guide article header, blue sky landscape background, airplane and landmark silhouette elements, suitcase icon, vibrant "Travel Guide" title, fresh blue tone, 900x383, 4K', model_used='flux-pro' WHERE title='旅游攻略首图' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='职场干货公众号首图，商务蓝灰色调背景，图表上升趋势元素，办公场景元素，"职场进阶"专业标题，简约商务风格', prompt_en='Career tips article header, business blue-gray tone background, rising chart trend elements, office scene elements, professional "Career Growth" title, minimalist business style, 900x383, 4K', model_used='flux-pro' WHERE title='职场干货首图' AND (prompt IS NULL OR prompt='');

-- ═══ 行政办公/教育 ═══
UPDATE templates SET prompt='商务工作汇报PPT封面，深蓝色专业背景，几何线条装饰，公司logo区域，"年度工作汇报"大标题，简洁大气排版', prompt_en='Business work report PPT cover, deep blue professional background, geometric line decorations, company logo area, large "Annual Work Report" title, clean and grand layout, 1920x1080, 4K', model_used='flux-pro' WHERE title='工作汇报PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='项目方案封面设计，蓝色渐变商务背景，建筑城市剪影元素，"项目策划方案"正式标题，团队信息区域，专业正式风格', prompt_en='Project proposal cover design, blue gradient business background, building cityscape silhouette elements, formal "Project Proposal" title, team info area, professional formal style, 1920x1080, 4K', model_used='flux-pro' WHERE title='项目方案封面' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='会议通知公告模板，白色简洁背景，蓝色标题栏，时间地点议程信息清晰排列，公司logo区域，正式行政风格', prompt_en='Meeting notice announcement template, white clean background, blue title bar, clearly arranged time location and agenda info, company logo area, formal administrative style, 750x1334, 4K', model_used='flux-pro' WHERE title='会议通知公告' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='招聘海报设计，蓝色与白色专业配色，职位信息分栏展示，公司福利图标列表，"加入我们"号召力标题，现代简约排版', prompt_en='Recruitment poster design, professional blue and white color scheme, job info column display, company benefits icon list, compelling "Join Us" title, modern minimalist layout, 750x1334, 4K', model_used='flux-pro' WHERE title='招聘海报模板' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='校园招聘宣传海报，绿色活力青春配色，校园元素插画，职位列表区域，"秋季校招"醒目标题，年轻化设计风格', prompt_en='Campus recruitment poster, vibrant green youthful color scheme, campus element illustrations, job listing area, bold "Fall Campus Recruitment" title, youthful design style, 750x1000, 4K', model_used='flux-pro' WHERE title='校园招聘海报' AND (prompt IS NULL OR prompt='');

-- ═══ 生活娱乐 ═══
UPDATE templates SET prompt='生日派对邀请函设计，彩色气球彩带装饰，生日蛋糕元素，"生日快乐"可爱标题，五彩纸屑背景，欢乐庆祝氛围', prompt_en='Birthday party invitation design, colorful balloon and ribbon decorations, birthday cake elements, cute "Happy Birthday" title, confetti background, joyful celebration atmosphere, 4K', model_used='flux-pro' WHERE title='生日派对邀请函' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='婚礼电子请柬设计，金色与白色优雅配色，花卉水彩边框装饰，新人照片展示区，"诚邀您的见证"浪漫标题，高端质感', prompt_en='Wedding e-invitation design, elegant gold and white color scheme, watercolor floral frame decoration, couple photo display area, romantic "We Invite Your Presence" title, premium quality feel, 4K', model_used='flux-pro' WHERE title='婚礼电子请柬' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='宠物相册封面设计，可爱卡通宠物插画边框，爪印和骨头装饰元素，照片展示区域，"我的毛孩子"手写标题，暖黄色调', prompt_en='Pet album cover design, cute cartoon pet illustration frame, paw print and bone decoration elements, photo display area, handwritten "My Fur Baby" title, warm yellow tone, 4K', model_used='flux-pro' WHERE title='宠物相册封面' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='旅行纪念册封面，复古邮票和明信片元素，世界地图背景纹理，旅行照片拼贴区域，"旅途记忆"文艺标题，棕色复古色调', prompt_en='Travel journal cover, vintage stamp and postcard elements, world map background texture, travel photo collage area, artistic "Journey Memories" title, brown vintage tone, 4K', model_used='flux-pro' WHERE title='旅行纪念册' AND (prompt IS NULL OR prompt='');

-- ═══ PPT ═══
UPDATE templates SET prompt='年终总结PPT封面，深蓝色大气背景，金色点缀线条，数据图表元素，"2024年终总结"大字标题，专业商务排版', prompt_en='Year-end summary PPT cover, grand deep blue background, gold accent lines, data chart elements, large "2024 Year-End Summary" title, professional business layout, 1920x1080, 4K', model_used='flux-pro' WHERE title='年终总结PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='产品发布会PPT封面，纯黑背景苹果风设计，产品剪影居中展示，聚光灯效果，简洁产品名称标题，极简科技风格', prompt_en='Product launch PPT cover, pure black Apple-style design, centered product silhouette, spotlight effect, clean product name title, minimalist tech style, 1920x1080, 4K', model_used='flux-pro' WHERE title='产品发布会PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='教育培训课件PPT封面，清新绿色渐变背景，书本铅笔学术元素，"课程名称"清晰标题，教师和学校信息区域，清爽学术风', prompt_en='Education courseware PPT cover, fresh green gradient background, book and pencil academic elements, clear "Course Name" title, teacher and school info area, clean academic style, 1920x1080, 4K', model_used='flux-pro' WHERE title='教育课件PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='创意广告方案PPT封面，彩色渐变时尚背景，创意灯泡图形元素，"创意方案提报"动感标题，现代潮流设计风格', prompt_en='Creative advertising proposal PPT cover, colorful gradient trendy background, creative lightbulb graphic elements, dynamic "Creative Proposal" title, modern trendy design style, 1920x1080, 4K', model_used='flux-pro' WHERE title='创意方案PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='商业计划书PPT封面，蓝色与白色专业配色，上升箭头图表元素，城市天际线剪影，"商业计划书"正式标题，高端商务风格', prompt_en='Business plan PPT cover, professional blue and white color scheme, rising arrow chart elements, city skyline silhouette, formal "Business Plan" title, premium business style, 1920x1080, 4K', model_used='flux-pro' WHERE title='商业计划书PPT' AND (prompt IS NULL OR prompt='');

UPDATE templates SET prompt='融资路演PPT封面，黑金高端配色，数据增长曲线元素，投资回报图形，"融资路演"金色大标题，大气奢华风格', prompt_en='Fundraising roadshow PPT cover, premium black and gold color scheme, data growth curve elements, ROI graphics, golden "Investor Pitch" title, grand luxurious style, 1920x1080, 4K', model_used='flux-pro' WHERE title='融资路演PPT' AND (prompt IS NULL OR prompt='');

-- 为剩余没有 prompt 的模板，根据 title + scene 自动生成通用提示词
UPDATE templates SET prompt = title || '设计模板，' || style || '风格，' || color || '配色，适用于' || scene || '场景，' || industry || '行业，专业设计排版，高质量输出', prompt_en = title || ' design template, ' || style || ' style, ' || color || ' color scheme, suitable for ' || scene || ' scene, ' || industry || ' industry, professional design layout, high quality output, 4K', model_used = 'flux-pro' WHERE prompt IS NULL OR prompt = '';
