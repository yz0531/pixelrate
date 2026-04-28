const config = require('./config');
const codeStore = new Map();
const sendLogs = new Map();

function canSend(phone) {
  const now = Date.now(), log = sendLogs.get(phone);
  if (!log) return { ok: true };
  if (now - log.lastSendTime < 60000) return { ok: false, error: `请${Math.ceil((60000-(now-log.lastSendTime))/1000)}秒后再试` };
  const today = new Date().toDateString();
  if (log.date !== today) { log.date = today; log.todayCount = 0; }
  if (log.todayCount >= (config.sms?.dailyLimit || 5)) return { ok: false, error: '今日发送次数已达上限' };
  return { ok: true };
}

async function sendCode(phone) {
  const check = canSend(phone);
  if (!check.ok) throw new Error(check.error);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expiresIn = config.sms?.codeExpiresIn || 300;
  codeStore.set(phone, { code, expires: Date.now() + expiresIn * 1000, verified: false });
  const now = Date.now();
  const log = sendLogs.get(phone) || { lastSendTime: 0, date: '', todayCount: 0 };
  log.lastSendTime = now; log.todayCount = (log.todayCount||0) + 1;
  sendLogs.set(phone, log);

  if (!config.sms?.tencent?.enabled) {
    console.log(`[SMS 开发模式] ${phone} 验证码: ${code} (${expiresIn}秒有效)`);
    return { success: true, devMode: true };
  }

  const tencentcloud = require('tencentcloud-sdk-nodejs');
  const SmsClient = tencentcloud.sms.v20210111.Client;
  const req = new tencentcloud.sms.v20210111.Models.SendSmsRequest();
  const client = new SmsClient({
    credential: { secretId: config.sms.tencent.secretId, secretKey: config.sms.tencent.secretKey },
    region: config.sms.tencent.region || 'ap-guangzhou',
    profile: { httpProfile: { endpoint: 'sms.tencentcloudapi.com' } }
  });
  req.SmsSdkAppId = config.sms.tencent.appId;
  req.SignName = config.sms.tencent.signName;
  req.TemplateId = config.sms.tencent.templateId;
  req.TemplateParamSet = [code, String(Math.floor(expiresIn/60))];
  req.PhoneNumberSet = [`+86${phone}`];
  const res = await client.SendSms(req);
  if (res.SendStatusSet?.[0]?.Code === 'Ok') return { success: true };
  throw new Error('短信发送失败');
}

function verifyCode(phone, code) {
  const r = codeStore.get(phone);
  if (!r) return { ok: false, error: '验证码不存在或已过期' };
  if (Date.now() > r.expires) { codeStore.delete(phone); return { ok: false, error: '验证码已过期' }; }
  if (r.verified) return { ok: false, error: '验证码已使用' };
  if (r.code !== code) return { ok: false, error: '验证码错误' };
  r.verified = true; codeStore.delete(phone);
  return { ok: true };
}

setInterval(() => { const now = Date.now(); for (const [k,v] of codeStore) { if (now > v.expires) codeStore.delete(k); } }, 600000);

module.exports = { sendCode, verifyCode };