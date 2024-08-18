/*
此文件为Node.js专用。其他用户请忽略
重组Cookie：
   分为 随机、优先、轮换 3 种模式：
   1、随机模式：支持自定义从所有 Cookie 中随机抽取若干数量的账号按随机顺序参加活动；
   2、优先模式：支持自定义前若干数量的账号固定按照正常顺序参加活动，其余账号按随机顺序参加活动；
   3、轮换模式：支持自定义前若干数量的账号固定按照正常顺序参加活动，其余账号按轮换模式参加活动。所谓轮换就是指若干数量的账号每过一天挪动到 Cookie 队伍末尾。
*/

// 优先/轮换模式(固定车头),表示前 N 个账号固定按正常顺序参加活动。
const FIXED_COOKIE_COUNT = parseInt(process.env.FIXED_COOKIE_COUNT) || 5;

// 轮换模式(每日轮换的账号数量),表示自定义轮换频次，即单日参加轮换的账号数量。
const MOVE_INCREMENT = parseInt(process.env.MOVE_INCREMENT) || 8;

// 随机模式(随机抽取ck数量),表示随意抽取 N 个账号随机顺序参加活动。
const RANDOM_COOKIE_COUNT = parseInt(process.env.RANDOM_COOKIE_COUNT) || 20;

//[♨️主设置开关] 是否开启随机轮换(1开启随机模式(随机抽取)/2开启优先模式(固定后再随机)/3开启轮换模式(固定车头再固定换位)/0关闭)。
const ENABLE_COOKIE_ROTATION = parseInt(process.env.ENABLE_COOKIE_ROTATION) || 0;

// 指定需要放在末尾的 pt_pin 值 或者 用户名(支持中文) 列表,表示按 pt_pin 或者 用户名(支持中文) 禁止账号。各账号间可用 , & |或@或换行隔开。
const specifiedPins = [];

process.env.BOTTOM_COOKIE_LIST ? process.env.BOTTOM_COOKIE_LIST.split(/[@,&|\n]/).forEach(
    (item) => specifiedPins.push(item))
    : '';

// 临时剔除 pt_pin 值 或者 用户名(支持中文) 列表,表示按 pt_pin 或者 用户名(支持中文) 禁止账号。各账号间可用 , & |或@或换行隔开。
const pinsToTemporarilyRemove = [];

process.env.REMOVE_COOKIE_LIST ? process.env.REMOVE_COOKIE_LIST.split(/[@,&|\n]/).forEach(
    (item) => pinsToTemporarilyRemove.push(item))
    : '';

// 判断环境变量里面是否有京东ck
if (process.env.JD_COOKIE) {
  if (process.env.JD_COOKIE.indexOf('&') > -1) {
    CookieJDs = process.env.JD_COOKIE.split('&');
  } else if (process.env.JD_COOKIE.indexOf('\n') > -1) {
    CookieJDs = process.env.JD_COOKIE.split('\n');
  } else {
    CookieJDs = [process.env.JD_COOKIE];
  }
}

if (JSON.stringify(process.env).indexOf('GITHUB')>-1) {
  console.log(`请勿使用github action运行此脚本,无论你是从你自己的私库还是其他哪里拉取的源代码，都会导致我被封号\n`);
  !(async () => {
    await require('./sendNotify').sendNotify('提醒', `请勿使用github action、滥用github资源会封我仓库以及账号`)
    await process.exit(0);
  })()
}

CookieJDs = [...new Set(CookieJDs.filter(item => !!item))];

if (ENABLE_COOKIE_ROTATION == 1) {
  CookieJDs = combine_random(RANDOM_COOKIE_COUNT)
} else if (ENABLE_COOKIE_ROTATION == 2) {
  CookieJDs = combine_priority(FIXED_COOKIE_COUNT);
} else if (ENABLE_COOKIE_ROTATION == 3) {
  CookieJDs = combine_rotation(FIXED_COOKIE_COUNT, MOVE_INCREMENT);
} else {
   console.log(`\n# 全部 Cookie 按正常顺序参加活动...\n`);
}

// 随机模式算法
function combine_random(num) {
  const ori_user_sum = CookieJDs.length;

  console.log("\n# 正在应用 随机Cookie 模式...");

  // 检查随机抽取数量是否有效
  const ran_num = Number.isInteger(num) && num <= ori_user_sum ? num : ori_user_sum;

  console.log(`# 当前总共 ${ori_user_sum} 个有效账号，本次随机抽取 ${ran_num} 个账号按随机顺序参加活动。`);

  // 生成随机抽取的索引
  const indices = Array.from({ length: ori_user_sum }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // 按随机索引生成结果
  let combined_all = [];
  for (let i = 0; i < ran_num; i++) {
    combined_all.push(CookieJDs[i]);
  }

  return combined_all;
}

// 优先模式算法
function combine_priority(fixedNum) {
  const ori_user_sum = CookieJDs.length;

  // 检查固定区账号数量
  const fixed_num = Number.isInteger(fixedNum) ? fixedNum : 0;

  if (fixed_num >= ori_user_sum) {
    console.log("\n# 优先固定账号数量不得大于或等于有效账号总量，本次暂不重组 Cookie ...");
    return CookieJDs;
  } else if (fixed_num === 0) {
    console.log("\n# 未设定优先固定数量，本次暂不重组 Cookie ...");
    return CookieJDs;
  } else {
    console.log("\n# 正在应用 优先Cookie 模式...");
    console.log(`# 当前总共 ${ori_user_sum} 个有效账号，其中前 ${fixed_num} 个账号为固定顺序。\n# 本次从第 ${fixed_num + 1} 个账号开始按随机顺序参加活动。`);

    // 固定区账号
    let jdCookie_priority = [];
    for (let i = 0; i < fixed_num; i++) {
      jdCookie_priority.push(CookieJDs[i]);
    }

    // 需要随机的账号部分
    let jdCookie_random = [];
    for (let i = fixed_num; i < ori_user_sum; i++) {
      jdCookie_random.push(CookieJDs[i]);
    }
    
    // 打乱顺序
    for (let i = jdCookie_random.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [jdCookie_random[i], jdCookie_random[j]] = [jdCookie_random[j], jdCookie_random[i]];
    }

    // 合并固定区和随机区
    const combined_all = [...jdCookie_priority, ...jdCookie_random];
    return combined_all;
  }
}

// 轮换模式算法
function combine_rotation(fixedNum, moveIncrement) {
  // 获取当月总天数
  const date = new Date();
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const totalDays = new Date(year, month, 0).getDate();

  // 今天几号
  const todayDay = date.getDate();
  
  // 固定区账号数量
  const fixed_num = Number.isInteger(fixedNum) ? fixedNum : 0;
  const ori_user_sum = CookieJDs.length;

  if (fixed_num >= ori_user_sum) {
    console.log("\n# 优先固定账号数量不得大于或等于有效账号总量，本次暂不重组 Cookie ...");
    return CookieJDs;
  } else if (todayDay > 1) {
    console.log("\n# 正在应用 轮换Cookie 模式...");
    
    // 轮换区的账号数量
    const rot_total_num = ori_user_sum - fixed_num;

    if (rot_total_num > 2) {
      // 每日轮换的账号数量
      let rot_num = Number.isInteger(moveIncrement) && moveIncrement > 0 && rot_total_num >= moveIncrement 
        ? moveIncrement 
        : Math.max(1, Math.ceil(rot_total_num / totalDays));

      let rot_start_num = fixed_num + rot_num * (todayDay - 1);
      
      while (ori_user_sum <= rot_start_num) {
        rot_start_num -= rot_total_num;
      }

      console.log(`# 当前总共 ${ori_user_sum} 个有效账号${fixed_num > 0 ? `，其中前 ${fixed_num} 个账号为固定顺序` : '，所有账号参与轮换'}。`);
      console.log(`# 今天从第 ${rot_start_num + 1} 位账号开始轮换，轮换频次为：${rot_num} 个账号/天。`);

      // 交换位置的方式进行轮换
      for (let i = 0; i < rot_num; i++) {
        let fromIndex = rot_start_num + i;
        let toIndex = (fixed_num + i) % rot_total_num + fixed_num;  // 修改目标索引计算方式

        if (fromIndex < ori_user_sum) {
          // console.log(`交换 ${fromIndex + 1} 和 ${toIndex + 1} 位置的账号`);
          [CookieJDs[toIndex], CookieJDs[fromIndex]] = [CookieJDs[fromIndex], CookieJDs[toIndex]];
        }
      }
      return CookieJDs;
    } else {
      console.log("# 由于参加轮换的账号数量不足 2 个，本次暂不重组 Cookie ...");
      return CookieJDs;
    }
  } else if (todayDay === 1) {
    console.log("# 今天是 1 号，不应用轮换模式，全部 Cookie 按正常顺序参加活动...");
    return CookieJDs;
  }
}

let countRemoved = 0;

// 临时剔除指定的 pt_pin
pinsToTemporarilyRemove.forEach(pin => {
  const isEncoded = /%[0-9A-Fa-f]{2}/.test(pin);
  const searchPin = isEncoded ? decodeURIComponent(pin) : pin;
  const filteredCookieJDs = [];

  CookieJDs.forEach(cookie => {
    const cookiePinMatch = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
    if (!cookiePinMatch || cookiePinMatch !== searchPin) {
      filteredCookieJDs.push(cookie);
    } else {
      countRemoved++;
    }
  });

  // 临时剔除指定的 pt_pin
  CookieJDs = filteredCookieJDs;
});

if (countRemoved > 0) console.log(`# 已临时禁止了 ${countRemoved} 个 JD_COOKIE。\n`)

console.log(`\n===============共${CookieJDs.length}个京东账号Cookie===============`);
console.log(`===============脚本执行- 北京时间(UTC+8)：${new Date(new Date().getTime() + new Date().getTimezoneOffset()*60*1000 + 8*60*60*1000).toLocaleString('zh', {hour12: false}).replace(' 24:',' 00:')}===============\n`);
if (process.env.JD_DEBUG && process.env.JD_DEBUG === 'false') console.log = () => {};

let countMovedToEnd = 0;

// 将指定的 pt_pin 放在数组末尾
specifiedPins.forEach(pin => {
  const isEncoded = /%[0-9A-Fa-f]{2}/.test(pin);
  const searchPin = isEncoded ? decodeURIComponent(pin) : pin;
  const index = CookieJDs.findIndex(cookie => {
    const cookiePinMatch = decodeURIComponent(cookie.match(/pt_pin=([^; ]+)(?=;?)/) && cookie.match(/pt_pin=([^; ]+)(?=;?)/)[1]);
    if (!cookiePinMatch) return;
    return cookiePinMatch == searchPin;
  });
  if (index !== -1) {
    const specifiedPin = CookieJDs[index];

    // 创建新数组，不包含指定的 pt_pin
    let newCookieJDs = [];
    for (let idx = 0; idx < CookieJDs.length; idx++) {
      if (idx !== index) {
        newCookieJDs.push(CookieJDs[idx]);
      }
    }
    CookieJDs = newCookieJDs;

    // 将指定的 pt_pin 添加到数组末尾
    CookieJDs.push(specifiedPin);

    countMovedToEnd++;
  }
});

if (countMovedToEnd > 0) console.log(`# 当前有 ${countMovedToEnd} 个账号固定在末尾。\n`)

for (let i = 0; i < CookieJDs.length; i++) {
  if (!CookieJDs[i].match(/pt_pin=(.+?);/) || !CookieJDs[i].match(/pt_key=(.+?);/)) console.log(`\n提示:京东cookie 【${CookieJDs[i]}】填写不规范,可能会影响部分脚本正常使用。正确格式为: pt_key=xxx;pt_pin=xxx;（分号;不可少）\n`);
  const index = (i + 1 === 1) ? '' : (i + 1);
  exports['CookieJD' + index] = CookieJDs[i].trim();
}