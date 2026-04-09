#!/usr/bin/env node
/**
 * deploy.mjs — OpenCode 一键部署脚本（配置 + 二进制）
 * 支持：macOS / Linux / Windows
 *
 * ─── 常用命令 ────────────────────────────────────────────────────────────────
 *
 *   node scripts/deploy.mjs                 # 首次安装 / 日常更新配置
 *   node scripts/deploy.mjs --full          # 配置 + 二进制一起更新
 *   node scripts/deploy.mjs --binary        # 只更新二进制
 *   node scripts/deploy.mjs --check         # 只查版本，不动任何东西
 *
 * ─── Key 管理 ────────────────────────────────────────────────────────────────
 *
 *   首次运行会自动扫描已有配置。扫不到会提示输入，填一次后保存在本机，
 *   后续运行不再重复问。
 *
 *   手动覆盖：
 *   node scripts/deploy.mjs --api-key=sk-xxx        # 替换 API Key
 *   node scripts/deploy.mjs --base-url=http://...    # 替换 Base URL
 *
 *   获取 API Key：https://platform.openai.com/api-keys
 *
 * ─── 其他选项 ────────────────────────────────────────────────────────────────
 *
 *   --dry-run        预览变更，不写任何文件
 *   --verify-only    只对比，不修改
 *   --key-bailian=   百炼 API Key（可选）
 *   --google-base-url= Google 模型用不同 Base URL 时指定
 *
 * ⚠️  opencode.json（MCP 配置、默认模型）是机器特定文件，本脚本不会覆盖它
 */

import { execFileSync, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import readline from 'readline';
import https from 'https';

// ─── 路径检测 ────────────────────────────────────────────────────────────────

const isWindows = process.platform === 'win32';
const HOME = os.homedir();

/** 本机实际配置目录（opencode 真正读取的位置） */
const CFG_DIR = path.join(HOME, '.config', 'opencode');

/** git 配置库位置（Windows 与 macOS/Linux 不同） */
const REPO_DIR = isWindows
  ? path.join(HOME, 'AppData', 'Roaming', 'opencode')
  : CFG_DIR; // macOS/Linux：配置目录本身就是 git repo

/** plugin 缓存路径（用 file:// 绕过 npm install 挂起） */
const PLUGIN_CACHE = path.join(HOME, '.cache', 'opencode', 'node_modules', 'oh-my-opencode');

/** opencode 工作目录（需要放 package-lock.json 避免每次启动 reify 延迟） */
const OPENCODE_WORKDIR = path.join(HOME, '.opencode');

/** 二进制安装目录 */
const BINARY_DIR = isWindows
  ? path.join(HOME, 'AppData', 'Local', 'opencode-bin')
  : (() => { try { return path.dirname(execSync('which opencode', { encoding: 'utf8' }).trim()); } catch { return path.join(HOME, '.local', 'bin'); } })();

/** 二进制文件名 */
const BINARY_FILENAME = isWindows ? 'opencode.exe' : 'opencode';

/** 安装的版本戳文件 */
const VERSION_STAMP = path.join(OPENCODE_WORKDIR, '.installed_version');

/** 源码仓库（GitHub Releases 来源） */
const SOURCE_REPO = 'vinnfeng/opencode';

// ─── 分支选择 ────────────────────────────────────────────────────────────────

const BRANCH = isWindows ? 'office-windows' : 'main';

// ─── 要部署的文件 ─────────────────────────────────────────────────────────────

/** 单个文件（相对 repo 根目录） */
const FILES = ['oh-my-openagent.json', 'AGENT-GUIDE.md', 'README.md'];

/** 整个目录（递归展开） */
const DIRS = ['agents', 'plugins', 'skills'];

// ─── CLI 参数 ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN      = args.includes('--dry-run');
const VERIFY_ONLY  = args.includes('--verify-only');
const WITH_BINARY  = args.includes('--binary') || args.includes('--full');
const CONFIG_ONLY  = !args.includes('--binary'); // --binary 单独用时跳过配置
const CHECK_ONLY   = args.includes('--check');
const FULL         = args.includes('--full');
const getArg = name => { const a = args.find(x => x.startsWith(`--${name}=`)); return a ? a.split('=').slice(1).join('=') : null; };

// ─── 工具函数 ─────────────────────────────────────────────────────────────────

const log    = m => console.log(`  ${m}`);
const ok     = m => console.log(`  ✅ ${m}`);
const warn   = m => console.log(`  ⚠️  ${m}`);
const fail   = m => console.error(`  ❌ ${m}`);
const header = m => console.log(`\n── ${m} ${'─'.repeat(Math.max(0, 50 - m.length))}`);

const git    = (...a) => execFileSync('git', ['-C', REPO_DIR, ...a], { encoding: 'utf8' }).trim();
const gitRaw = (...a) => execFileSync('git', ['-C', REPO_DIR, ...a]);

/** 从远端分支读取文件的原始字节（LF 行尾） */
const gitBytes  = p => gitRaw('show', `origin/${BRANCH}:${p}`);

/** 列出远端分支某目录下的所有文件 */
const gitLsDir  = d => { const o = git('ls-tree', '-r', '--name-only', `origin/${BRANCH}`, `${d}/`); return o ? o.split('\n').filter(Boolean) : []; };

/** 写文件（自动创建上级目录） */
const writeFile = (t, c) => { fs.mkdirSync(path.dirname(t), { recursive: true }); Buffer.isBuffer(c) ? fs.writeFileSync(t, c) : fs.writeFileSync(t, c, 'utf8'); };

/** 内容对比（归一化行尾后比较，忽略 CRLF 差异） */
const same = (a, b) => { const n = x => (Buffer.isBuffer(x) ? x : Buffer.from(x, 'utf8')).toString('binary').replace(/\r\n/g, '\n').trimEnd(); return n(a) === n(b); };

/** 交互式提示（非 TTY 环境直接返回默认值） */
const prompt = (q, def = '') => new Promise(res => {
  if (!process.stdin.isTTY) return res(def);
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.question(`  ${q}${def ? ` [${def.slice(0,30)}…]` : ''}: `, a => { rl.close(); res(a.trim() || def); });
});

// ─── .keys 文件（持久化 API keys 和 base URL，gitignored）────────────────────

const KEYS_FILE = path.join(CFG_DIR, '.keys');

function readKeysFile() {
  if (!fs.existsSync(KEYS_FILE)) return {};
  return Object.fromEntries(
    fs.readFileSync(KEYS_FILE, 'utf8')
      .split('\n')
      .map(l => l.trim())
      .filter(l => l && !l.startsWith('#') && l.includes('='))
      .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; })
  );
}

function writeKeysFile(kvs) {
  const lines = Object.entries(kvs).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`);
  fs.mkdirSync(path.dirname(KEYS_FILE), { recursive: true });
  fs.writeFileSync(KEYS_FILE, lines.join('\n') + '\n', 'utf8');
  // 设 600 权限（Unix only）
  if (!isWindows) { try { fs.chmodSync(KEYS_FILE, 0o600); } catch {} }
}

// ─── 二进制相关 ───────────────────────────────────────────────────────────────

/** 获取当前平台的 GitHub Release 二进制文件名 */
function getBinaryAssetName() {
  const arch = os.arch() === 'arm64' ? 'arm64' : 'x64';
  if (isWindows) return `opencode-windows-${arch}.exe`;
  const plat = process.platform === 'darwin' ? 'darwin' : 'linux';
  return `opencode-${plat}-${arch}`;
}

/** 从 GitHub API 获取最新 Release tag（无需认证，仓库已公开） */
function getLatestReleaseTag() {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'api.github.com',
      path: `/repos/${SOURCE_REPO}/releases/latest`,
      headers: { 'User-Agent': 'opencode-deploy-script' },
    };
    https.get(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data).tag_name); }
        catch { reject(new Error('解析 Release 信息失败')); }
      });
    }).on('error', reject);
  });
}

/** 读取本地已安装版本戳 */
function getInstalledVersion() {
  try { return fs.readFileSync(VERSION_STAMP, 'utf8').trim(); } catch { return null; }
}

/** 下载文件（支持 302 重定向） */
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const doGet = (u) => {
      https.get(u, { headers: { 'User-Agent': 'opencode-deploy-script' } }, res => {
        if (res.statusCode === 302 || res.statusCode === 301) { doGet(res.headers.location); return; }
        if (res.statusCode !== 200) { reject(new Error(`下载失败 HTTP ${res.statusCode}: ${u}`)); return; }
        const tmp = destPath + '.tmp';
        const out = fs.createWriteStream(tmp);
        let downloaded = 0;
        res.on('data', chunk => { downloaded += chunk.length; process.stdout.write(`\r  ⬇️  ${(downloaded / 1024 / 1024).toFixed(1)} MB`); });
        res.pipe(out);
        out.on('finish', () => { process.stdout.write('\n'); fs.renameSync(tmp, destPath); resolve(); });
        out.on('error', reject);
      }).on('error', reject);
    };
    doGet(url);
  });
}

/** 更新二进制 */
async function updateBinary(latestTag) {
  const assetName = getBinaryAssetName();
  const downloadUrl = `https://github.com/${SOURCE_REPO}/releases/download/${latestTag}/${assetName}`;
  const binaryPath = path.join(BINARY_DIR, BINARY_FILENAME);

  // 备份旧版本
  if (fs.existsSync(binaryPath)) {
    const bakPath = binaryPath + `.bak.${latestTag}`;
    fs.copyFileSync(binaryPath, bakPath);
    log(`旧版本已备份: ${path.basename(bakPath)}`);
  }

  fs.mkdirSync(BINARY_DIR, { recursive: true });
  log(`下载 ${assetName} ...`);
  await downloadFile(downloadUrl, binaryPath);

  // macOS/Linux 加执行权限
  if (!isWindows) fs.chmodSync(binaryPath, 0o755);

  // 写版本戳
  fs.mkdirSync(OPENCODE_WORKDIR, { recursive: true });
  fs.writeFileSync(VERSION_STAMP, latestTag, 'utf8');

  ok(`二进制已更新: ${latestTag}  →  ${binaryPath}`);
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────

async function main() {
  const modeLabel = CHECK_ONLY ? 'CHECK ONLY' : FULL ? '全量（配置 + 二进制）' : WITH_BINARY ? '只更新二进制' : DRY_RUN ? 'DRY RUN' : VERIFY_ONLY ? 'VERIFY ONLY' : '只更新配置';
  console.log('\n🚀 OpenCode 部署脚本');
  console.log(`   平台: ${process.platform}  分支: ${BRANCH}  模式: ${modeLabel}`);
  console.log(`   配置目录: ${CFG_DIR}`);
  console.log(`   配置库:   ${REPO_DIR}`);

  // ── --check：只查版本，不做任何更改 ──────────────────────────────────────
  if (CHECK_ONLY) {
    header('版本检查');
    const local = getInstalledVersion();
    log(`本地版本: ${local || '(未知，版本戳文件不存在)'}`);
    try {
      const latest = await getLatestReleaseTag();
      if (local === latest) ok(`二进制已是最新: ${latest}`);
      else warn(`有新版本: ${latest}  (本地: ${local || '未知'})  → 运行 --binary 或 --full 更新`);
    } catch (e) { warn(`获取最新版本失败: ${e.message}`); }
    const cfgTag = git('log', '-1', '--format=%h %s', `origin/${BRANCH}`);
    log(`配置库最新: ${cfgTag}`);
    return;
  }

  // ── Step 1: 前置检查 ───────────────────────────────────────────────────────
  header('Step 1  前置检查');
  if (!fs.existsSync(REPO_DIR)) { fail(`配置库不存在: ${REPO_DIR}`); process.exit(1); }
  try { git('status'); ok('git repo 正常'); } catch { fail('不是 git repo，请先 clone 配置库到正确位置'); process.exit(1); }

  // ── Step 2: 拉取最新 ───────────────────────────────────────────────────────
  if (!VERIFY_ONLY) {
    header('Step 2  拉取最新代码');
    try { git('fetch', '--all'); ok(`已拉取 origin（分支: ${BRANCH}）`); }
    catch (e) { warn(`fetch 失败（离线？），继续使用本地版本`); }
  }

  // ── Step 3: 备份 ───────────────────────────────────────────────────────────
  if (CONFIG_ONLY && !VERIFY_ONLY && !DRY_RUN) {
    header('Step 3  备份现有配置');
    const ts  = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const bak = `${CFG_DIR}.bak.${ts}`;
    if (fs.existsSync(CFG_DIR)) { fs.cpSync(CFG_DIR, bak, { recursive: true }); ok(`已备份到 ${bak}`); }
    else { fs.mkdirSync(CFG_DIR, { recursive: true }); log('配置目录不存在，已创建'); }
  }

  // ── Step 4: 获取 API Keys + Base URL ─────────────────────────────────────
  let apiKey = '', bailianKey = '', baseUrl = '', googleBaseUrl = '';
  if (CONFIG_ONLY && !VERIFY_ONLY) {
    header('Step 4  API Keys & Base URL');

    // ① .keys 文件（本脚本持久化存储，最可靠）
    let stored = readKeysFile();
    // 向后兼容：旧版 key 名（MIFY_*）自动迁移到新名（PROVIDER_*）
    if (!stored.PROVIDER_API_KEY && stored.MIFY_API_KEY) {
      stored.PROVIDER_API_KEY = stored.MIFY_API_KEY;
      stored.PROVIDER_BASE_URL = stored.MIFY_BASE_URL || '';
      stored.PROVIDER_GOOGLE_BASE_URL = stored.MIFY_GOOGLE_BASE_URL || '';
      delete stored.MIFY_API_KEY; delete stored.MIFY_BASE_URL; delete stored.MIFY_GOOGLE_BASE_URL;
      if (!DRY_RUN) writeKeysFile(stored);
      log('已自动迁移旧版 key 名称（MIFY_* → PROVIDER_*）');
    }
    apiKey          = stored.PROVIDER_API_KEY        || '';
    bailianKey       = stored.BAILIAN_API_KEY      || '';
    baseUrl      = stored.PROVIDER_BASE_URL        || '';
    googleBaseUrl= stored.PROVIDER_GOOGLE_BASE_URL || '';

    // ② 环境变量（CI / 自动化场景）
    if (!apiKey     && process.env.PROVIDER_API_KEY)  { apiKey    = process.env.PROVIDER_API_KEY;  log('Key：从环境变量 PROVIDER_API_KEY 检测到'); }
    if (!baseUrl && process.env.PROVIDER_BASE_URL) { baseUrl= process.env.PROVIDER_BASE_URL; log('Base URL：从环境变量 PROVIDER_BASE_URL 检测到'); }

    // ③ 扫描已有配置文件（兼容旧版 / 迁移场景）
    const scanCandidates = [
      path.join(CFG_DIR, 'opencode.jsonc'),                        // 本机已装的 opencode
      path.join(HOME, '.config', 'opencode', 'opencode.jsonc'),    // macOS/Linux 标准路径
    ];
    for (const src of [...new Set(scanCandidates)]) {
      if (!fs.existsSync(src)) continue;
      try {
        const raw = fs.readFileSync(src, 'utf8');
        if (!apiKey)          { const m = raw.match(/"apiKey"\s*:\s*"(sk-[^"]+)"/);                 if (m) { apiKey    = m[1]; log(`Key：从 ${path.relative(HOME, src)} 自动检测到`); } }
        if (!bailianKey)       { const m = raw.match(/dashscope[\s\S]*?"apiKey"\s*:\s*"(sk-[^"]+)"/);if (m) bailianKey  = m[1]; }
        if (!baseUrl)      { const m = raw.match(/"baseURL"\s*:\s*"(https?:\/\/[^"]+?)\/anthropic"/); if (m) { baseUrl = m[1]; log(`Base URL：从 ${path.relative(HOME, src)} 自动检测到`); } }
        if (!googleBaseUrl){ const m = raw.match(/"baseURL"\s*:\s*"(https?:\/\/[^"]+?)\/gemini"/);    if (m) googleBaseUrl = m[1]; }
      } catch {}
    }

    // ④ CLI 参数（最高优先级，用于手动覆盖）
    if (getArg('api-key'))        apiKey          = getArg('api-key');
    if (getArg('key-bailian'))     bailianKey       = getArg('key-bailian');
    if (getArg('base-url'))        baseUrl      = getArg('base-url');
    if (getArg('google-base-url')) googleBaseUrl= getArg('google-base-url');

    // ⑤ 交互式输入兜底（检测不到时才问）
    if (!apiKey) {
      log('');
      log('未检测到 API Key。没有的话先去申请（从服务商后台获取）：');
      log('  https://platform.openai.com/api-keys');
      log('');
      apiKey = await prompt('API Key (sk-...)', '');
    }
    if (!apiKey) { fail('API Key 不能为空，安装中止'); process.exit(1); }

    if (!baseUrl) {
      log('');
      log('未检测到 Base URL（内网服务地址）。');
      log('不知道？联系发给你这个链接的同学，或查看内部文档。');
      log('');
      baseUrl = await prompt('Base URL (http://...)', '');
    }
    if (!baseUrl) { fail('Base URL 不能为空，安装中止'); process.exit(1); }

    // Google 路由默认与主 Base URL 同域（大多数情况下一致）
    if (!googleBaseUrl) googleBaseUrl = baseUrl;

    if (!bailianKey) bailianKey = await prompt('百炼 API Key（可选，没有直接回车跳过）', '');

    // ⑥ 写回 .keys，下次运行自动读取，不再重复问
    if (!DRY_RUN) writeKeysFile({
      PROVIDER_API_KEY: apiKey, PROVIDER_BASE_URL: baseUrl,
      PROVIDER_GOOGLE_BASE_URL: googleBaseUrl,
      ...(bailianKey ? { BAILIAN_API_KEY: bailianKey } : {}),
    });

    const reused = apiKey === stored.PROVIDER_API_KEY && baseUrl === stored.PROVIDER_BASE_URL;
    if (reused) ok(`沿用已有 Key — ${apiKey.slice(0,12)}…（如需更换：--api-key=新key）`);
    else        ok(`Keys 就绪 — API: ${apiKey.slice(0,12)}…  Base: ${baseUrl.replace(/\/$/, '')}  百炼: ${bailianKey ? bailianKey.slice(0,12)+'…' : '未配置'}`);
  }

  // ── Step 5: 部署文件 ───────────────────────────────────────────────────────
  const R = { same: [], updated: [], added: [], skipped: [] };
  if (CONFIG_ONLY) {
    header('Step 5  部署配置文件');

    const deploy = (repoRel, target) => {
      let buf;
      try { buf = gitBytes(repoRel); } catch { warn(`git 中不存在: ${repoRel}`); R.skipped.push(repoRel); return; }
      if (fs.existsSync(target)) {
        if (same(buf, fs.readFileSync(target))) { R.same.push(repoRel); log(`SAME    ${repoRel}`); return; }
        R.updated.push(repoRel); log(`UPDATE  ${repoRel}`);
      } else { R.added.push(repoRel); log(`ADD     ${repoRel}`); }
      if (!DRY_RUN && !VERIFY_ONLY) writeFile(target, buf);
    };

    for (const f of FILES) deploy(f, path.join(CFG_DIR, f));
    for (const d of DIRS) for (const f of gitLsDir(d)) deploy(f, path.join(CFG_DIR, f));
  }

  // ── Step 6: 生成 opencode.jsonc ────────────────────────────────────────────
  if (CONFIG_ONLY && !VERIFY_ONLY) {
    header('Step 6  生成 opencode.jsonc（含真实 key）');
    let tmpl;
    try { tmpl = gitBytes('opencode.template.jsonc').toString('utf8'); }
    catch { fail('找不到 opencode.template.jsonc，跳过生成'); tmpl = null; }

    if (tmpl) {
      // 1. 替换 key + URL 占位符
      const base   = baseUrl.replace(/\/$/, '');
      const google = googleBaseUrl.replace(/\/$/, '');
      let jsonc = tmpl
        .replace(/PROVIDER_API_KEY/g,        apiKey)
        .replace(/BAILIAN_API_KEY/g,          bailianKey || 'BAILIAN_NOT_SET')
        .replace(/PROVIDER_URL\//g,           base   + '/')
        .replace(/PROVIDER_GOOGLE_URL\//g,    google + '/');

      // 2. 替换 plugin 为 file:// 本地路径（避免每次启动触发 npm install，约 10-30s 延迟）
      const fileUrl = 'file:///' + PLUGIN_CACHE.replace(/\\/g, '/');
      // 兼容两种模板占位符：main 用 PLUGIN_PATH，office-windows 用 oh-my-openagent@latest
      jsonc = jsonc.replace(/"PLUGIN_PATH"|"oh-my-openagent@latest"/, `"${fileUrl}"`);

      const target  = path.join(CFG_DIR, 'opencode.jsonc');
      const existed = fs.existsSync(target);
      const changed = !existed || !same(jsonc, fs.readFileSync(target));
      if (!DRY_RUN) writeFile(target, jsonc);
      ok(`opencode.jsonc ${existed ? (changed ? '已更新' : '无变化') : '已生成（新建）'}`);

      if (!fs.existsSync(PLUGIN_CACHE))
        warn(`插件缓存不存在: ${PLUGIN_CACHE}\n     首次启动会自动安装（约 30s），之后正常`);
    }
  }

  // ── Step 7: 修复启动 reify 延迟 ───────────────────────────────────────────
  if (CONFIG_ONLY && !VERIFY_ONLY && !DRY_RUN) {
    header('Step 7  修复启动 reify 延迟');
    const src = path.join(CFG_DIR, 'package-lock.json');
    const dst = path.join(OPENCODE_WORKDIR, 'package-lock.json');
    if (fs.existsSync(src)) {
      fs.mkdirSync(OPENCODE_WORKDIR, { recursive: true });
      fs.copyFileSync(src, dst);
      ok(`package-lock.json 已同步到 ~/.opencode/（消除每次启动 ~4s reify）`);
    } else {
      warn(`~/.config/opencode/package-lock.json 不存在，跳过（若启动有 ~4s 延迟属正常首次行为）`);
    }
  }

  // ── Step 8: 更新二进制 ────────────────────────────────────────────────────
  if (WITH_BINARY && !DRY_RUN && !VERIFY_ONLY) {
    header('Step 8  更新二进制');
    try {
      const latest = await getLatestReleaseTag();
      const installed = getInstalledVersion();
      log(`本地版本: ${installed || '（未知）'}  →  最新: ${latest}`);
      if (installed === latest) { ok(`已是最新版本: ${latest}，跳过下载`); }
      else { await updateBinary(latest); }
    } catch (e) { warn(`二进制更新失败: ${e.message}`); }
  }

  // ── Step 9: 汇总报告 ───────────────────────────────────────────────────────
  header('Step 9  汇总');
  console.log(`\n  文件结果:`);
  console.log(`    ✅ 相同（无需更新）: ${R.same.length} 个`);
  console.log(`    📝 已更新:           ${R.updated.length} 个`);
  console.log(`    ➕ 新增:             ${R.added.length} 个`);
  if (R.skipped.length) console.log(`    ⚠️  跳过（git 中不存在）: ${R.skipped.length} 个`);

  if (R.updated.length + R.added.length > 0) {
    console.log('\n  变更文件列表:');
    [...R.updated, ...R.added].forEach(f => console.log(`    · ${f}`));
  }

  console.log(R.skipped.length
    ? '\n  ⚠️  有文件跳过，请检查上方警告'
    : '\n  🎉 部署完成！重启 opencode 即可生效。');

  if (DRY_RUN)     console.log('\n  ℹ️  DRY RUN：以上为预览，未实际写入任何文件。');
  if (VERIFY_ONLY) console.log('\n  ℹ️  VERIFY ONLY：仅对比，未修改任何文件。');
}

main().catch(e => { console.error('\n💥 脚本出错:', e.message); process.exit(1); });
