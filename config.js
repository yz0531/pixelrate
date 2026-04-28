module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'pixelrate-dev-secret-change-in-production',
  jwtExpiresIn: '7d',
  dataDir: process.env.DATA_DIR || './data',
  dailyRatingLimit: 20,
  maxImageSize: 10 * 1024 * 1024,
  maxAvatarSize: 2 * 1024 * 1024,
  allowedImageTypes: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  allowedAvatarTypes: ['.jpg', '.jpeg', '.png', '.webp'],
  authRateLimit: { windowMs: 15 * 60 * 1000, max: 20 },
  apiRateLimit: { windowMs: 1 * 60 * 1000, max: 120 },
  categories: {
    landscape: '风景', portrait: '人像', street: '街拍',
    animal: '动物', abstract: '抽象', food: '美食'
  },
  sms: {
    codeExpiresIn: 300,
    dailyLimit: 5,
    phoneRegex: '^1[3-9]\\d{9}$',
    tencent: {
      enabled: false,
      secretId: '',
      secretKey: '',
      appId: '',
      signName: '',
      templateId: '',
      region: 'ap-guangzhou'
    }
  },
  moderation: {
    enabled: true,
    admins: ['风景猎人'],
    tencent: {
      enabled: false,
      secretId: '',
      secretKey: '',
      region: 'ap-hongkong'
    },
    rules: {
      porn: { enabled: true, blockScore: 60 },
      terrorism: { enabled: true, blockScore: 60 },
      politics: { enabled: true, blockScore: 60 },
      ads: { enabled: false, blockScore: 90 },
      illegal: { enabled: true, blockScore: 60 }
    }
  },
  sponsor: {
    title: '赞助支持',
    description: '如果你喜欢 PixelRate，欢迎请开发者喝杯咖啡，帮助服务器持续运行',
    wechatQr: '/images/sponsor-wechat.png',
    alipayQr: '/images/sponsor-alipay.png'
  },
  feedback: {
    title: '意见反馈',
    description: '遇到问题或有建议？欢迎通过以下方式联系我们',
    email: 'feedback@pixelrate.com',
    github: 'https://github.com/yourname/pixelrate/issues',
    wechatGroup: 'PixelRate2024'
  }
};