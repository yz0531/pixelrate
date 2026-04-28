const config = require('./config');
const STATUS = { PENDING: 'pending', APPROVED: 'approved', REJECTED: 'rejected' };

async function moderateImage(imageUrl) {
  if (!config.moderation?.enabled || !config.moderation.tencent?.enabled)
    return { status: STATUS.PENDING, reason: '等待人工审核', labels: [] };
  try {
    const tencentcloud = require('tencentcloud-sdk-nodejs');
    const ImsClient = tencentcloud.ims.v20201229.Client;
    const models = tencentcloud.ims.v20201229.Models;
    const client = new ImsClient({
      credential: { secretId: config.moderation.tencent.secretId, secretKey: config.moderation.tencent.secretKey },
      region: config.moderation.tencent.region || 'ap-hongkong',
      profile: { httpProfile: { endpoint: 'ims.tencentcloudapi.com' } }
    });
    const req = new models.ImageModerationRequest();
    req.FileUrl = imageUrl;
    req.Scenes = [];
    if (config.moderation.rules.porn?.enabled) req.Scenes.push('PORN');
    if (config.moderation.rules.terrorism?.enabled) req.Scenes.push('TERRORISM');
    if (config.moderation.rules.politics?.enabled) req.Scenes.push('POLITICS');
    if (config.moderation.rules.ads?.enabled) req.Scenes.push('ADS');
    if (config.moderation.rules.illegal?.enabled) req.Scenes.push('ILLEGAL');
    const res = await client.ImageModeration(req);
    let block = false, reason = '';
    if (res.PornInfo?.Suggestion === 'Block') { block = true; reason = '色情内容'; }
    if (res.TerrorismInfo?.Suggestion === 'Block') { block = true; reason = '暴恐内容'; }
    if (res.PoliticsInfo?.Suggestion === 'Block') { block = true; reason = '政治敏感'; }
    if (block) return { status: STATUS.REJECTED, reason, labels: [] };
    return { status: STATUS.APPROVED, reason: '审核通过', labels: [] };
  } catch (e) {
    console.error('审核失败:', e.message);
    return { status: STATUS.PENDING, reason: '自动审核失败，等人工审核', labels: [] };
  }
}

function isAdmin(user) {
  return user && config.moderation?.admins?.includes(user.username);
}

module.exports = { STATUS, moderateImage, isAdmin };