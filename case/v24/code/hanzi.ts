/**
 * MINE THE CHINESE NAMES, CHARACTER BY CHARACTER.
 *
 * A Chinese plant name is already a literal compound, which is the
 * whole reason Chinese is the model for how Tune should build words.
 * The data proves it agreeing with the Latin, morpheme for morpheme:
 *
 * ```text
 * Takakia ceratophylla   ceratophylla   horn + leaf
 * 角叶藻苔                 jiǎo yè zǎo tái  horn + leaf + algae + moss
 * ```
 *
 * So the Chinese name is a SECOND INDEPENDENT WITNESS to what a
 * species is called, and until now this project has been printing it
 * beside the Latin without reading it.
 *
 * ## Two sources, joined
 *
 * ```text
 * Unihan_Readings.txt        23,286 character definitions
 * cn-sp2000 scientific_names  genus_c and species_c per species
 * ```
 *
 * ## Why this matters more than another Latin field
 *
 * The Latin says what a botanist in 1806 thought. The Chinese says
 * what the plant is called by people who live near it, and the two
 * agreeing is far stronger evidence for a name than either alone.
 * Where they disagree, `design.md` already ranks it: accuracy wins,
 * and obviousness breaks the tie, which usually favours the Chinese.
 *
 * Writes `base/import/hanzi/breakdown.csv` and `gloss.csv`, so the
 * field joins the pipeline with no change anywhere else.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:hanzi
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const IMPORT = resolve(here, '../../../../../base/import')
const OUT = resolve(IMPORT, 'hanzi')
const PLANTS = resolve(IMPORT, 'taxon/plants/chinese')
const FILE = 'cn-sp2000-2025_植物完整版V1.01.scientific_names.csv'

/**
 * THE FOLK NAMES, WHICH NOTHING WAS READING.
 *
 * `cn-sp2000` ships a second file of Chinese names keyed by the same
 * `name_code`, 16,797 of them over 9,834 species, and the pipeline
 * had never opened it. They are not the formal botanical names in
 * `scientific_names.csv`: they are what people in a given province
 * actually call the plant, so they describe where the formal name
 * often just repeats the Latin.
 *
 * ```text
 * formal   凯氏藓属白氏凯氏藓    Bai's Kiaeria, a surname twice over
 * folk     白叶藓               white leaf moss
 *
 * formal   云杉属青杄           Picea wilsonii
 * folk     刺儿松, 黑扦松, 爪松   thorn pine, black pine, claw pine
 * ```
 *
 * 421 species that no witness could name have a folk name saying
 * something the formal one does not. That is a fifth witness sitting
 * unread in a file already on disk, which is worth checking for
 * before concluding that a gap needs data from somewhere else.
 */
const FOLK = 'cn-sp2000-2025_植物完整版V1.01.common_names.csv'
const UNIHAN = process.env.UNIHAN ?? '/tmp/unihan/Unihan_Readings.txt'

mkdirSync(OUT, { recursive: true })

// ─── What each character means ─────────────────────────

/**
 * A DEFINITION IS ONLY USEFUL IF IT IS ONE IDEA.
 *
 * Unihan writes `to lick; to taste, a mat, bamboo bark` for one
 * character, which is four senses in a trench coat. The first sense
 * before the first separator is the one a compound is built on, and
 * anything longer than three words is a description rather than a
 * meaning.
 */
const NOISE =
  /^\(|variant|same as|used in|surname|abbr|non-standard|see |radical|a place|dialect/i

/**
 * THE COMMON CHARACTERS, ANSWERED BY HAND.
 *
 * Unihan lists senses in no order a plant name cares about, so the
 * first one is often archaic. 叶 came out `harmonize`, which is the
 * rare 協 reading, in 2,898 names where it plainly means LEAF. One
 * wrong character at the top of the frequency list poisons thousands
 * of names, so the common ones are answered here and the long tail
 * is left to Unihan.
 *
 * Every entry was read off the character, not guessed from the
 * English: 蕨 is the fern, and Unihan says `pteris aquilina`, which
 * is the fern's Latin name rather than a meaning.
 */
const BY_HAND: Record<string, string> = {
  /**
   * THE CHARACTERS THAT WERE STOPPING THE MOST READINGS.
   *
   * Found by the report below, worst first, which is the same lever
   * that took Chinese coverage from 28,500 to 32,945 when 叶 turned
   * out to be `leaf` rather than Unihan's `harmonize`.
   *
   * **A transliteration gets no gloss, deliberately.** 罗, 阿, 韦 and
   * 辛 carry sound rather than sense in a plant name: 克什米尔 is
   * Kashmir spelled out, and 韩氏 is somebody called Han. Giving them
   * meanings would manufacture a description of a plant out of a
   * person's name, which is the one thing worse than leaving a gap.
   * They stay unread and the species stays honestly unnamed.
   */
  麻: 'hemp',
  茅: 'thatch',
  楼: 'stair',
  蓝: 'blue',
  羽: 'feather',
  梅: 'plum',
  江: 'river',
  无: 'without',
  米: 'rice',
  簕: 'thorn',
  楤: 'thorn',
  蓟: 'thistle',
  檀: 'sandalwood',
  玄: 'dark',
  箬: 'wrap',
  蓑: 'cape',
  匙: 'spoon',
  托: 'prop',
  贯: 'pierce',
  行: 'row',
  黍: 'millet',
  首: 'head',
  革: 'leather',
  源: 'spring',
  桐: 'tung',
  斗: 'scoop',
  葛: 'kudzu',
  叶: 'leaf',
  花: 'flower',
  草: 'grass',
  木: 'tree',
  树: 'tree',
  藓: 'moss',
  苔: 'moss',
  蕨: 'fern',
  莎: 'sedge',
  苣: 'lettuce',
  菜: 'vegetable',
  鳞: 'scale',
  子: 'seed',
  果: 'fruit',
  根: 'root',
  茎: 'stem',
  枝: 'branch',
  刺: 'thorn',
  毛: 'hair',
  丝: 'thread',
  皮: 'skin',
  角: 'horn',
  齿: 'tooth',
  舌: 'tongue',
  头: 'head',
  心: 'heart',
  眼: 'eye',
  耳: 'ear',
  足: 'foot',
  手: 'hand',
  尾: 'tail',
  翅: 'wing',
  山: 'mountain',
  水: 'water',
  海: 'sea',
  河: 'river',
  石: 'stone',
  土: 'earth',
  火: 'fire',
  金: 'gold',
  银: 'silver',
  铁: 'iron',
  玉: 'jade',
  天: 'sky',
  日: 'sun',
  月: 'moon',
  星: 'star',
  云: 'cloud',
  风: 'wind',
  雨: 'rain',
  雪: 'snow',
  冰: 'ice',
  白: 'white',
  黑: 'black',
  红: 'red',
  赤: 'red',
  黄: 'yellow',
  绿: 'green',
  青: 'blue',
  紫: 'purple',
  大: 'big',
  小: 'small',
  长: 'long',
  短: 'short',
  宽: 'wide',
  狭: 'narrow',
  厚: 'thick',
  薄: 'thin',
  尖: 'sharp',
  钝: 'blunt',
  圆: 'round',
  扁: 'flat',
  密: 'dense',
  疏: 'sparse',
  多: 'many',
  少: 'few',
  高: 'tall',
  低: 'low',
  深: 'deep',
  浅: 'shallow',
  软: 'soft',
  硬: 'hard',
  香: 'fragrant',
  臭: 'stinking',
  甜: 'sweet',
  苦: 'bitter',
  酸: 'sour',
  辣: 'hot',
  东: 'east',
  南: 'south',
  西: 'west',
  北: 'north',
  中: 'middle',
  上: 'above',
  下: 'below',
  野: 'wild',
  家: 'home',
  春: 'spring',
  夏: 'summer',
  秋: 'autumn',
  冬: 'winter',
  光: 'light',
  暗: 'dark',
  湿: 'wet',
  干: 'dry',
  垂: 'hanging',
  直: 'straight',
  曲: 'bent',
  弯: 'bent',
  卷: 'curled',
  裂: 'split',
  全: 'whole',
  半: 'half',
  单: 'single',
  双: 'double',
  三: 'three',
  四: 'four',
  五: 'five',
  六: 'six',
  七: 'seven',
  八: 'eight',
  九: 'nine',
  十: 'ten',
  一: 'one',
  二: 'two',
  拟: 'like',
  假: 'false',
  真: 'true',
  异: 'strange',
  同: 'same',
  新: 'new',
  老: 'old',
  美: 'beautiful',
  丽: 'beautiful',
  大叶: 'big leaf',
  泥: 'mud',
  炭: 'charcoal',
  华: 'flowery',
  兰: 'orchid',
  菊: 'chrysanthemum',
  藤: 'vine',
  竹: 'bamboo',
  松: 'pine',
  柏: 'cypress',
  柳: 'willow',
  桦: 'birch',
  栎: 'oak',
  枫: 'maple',
  桃: 'peach',
  李: 'plum',
  杏: 'apricot',
  梨: 'pear',
  枣: 'date',
  栗: 'chestnut',
  桑: 'mulberry',
  茶: 'tea',
  稻: 'rice',
  麦: 'wheat',
  豆: 'bean',
  瓜: 'melon',
  椒: 'pepper',
  姜: 'ginger',
  蒜: 'garlic',
  葱: 'onion',
  蘑: 'mushroom',
  菌: 'fungus',
  藻: 'algae',
  虫: 'insect',
  鸟: 'bird',
  鱼: 'fish',
  兽: 'beast',
  蛇: 'snake',
  龙: 'dragon',
  虎: 'tiger',
  熊: 'bear',
  鹿: 'deer',
  马: 'horse',
  牛: 'cow',
  羊: 'sheep',
  猪: 'pig',
  狗: 'dog',
  猫: 'cat',
  鼠: 'mouse',
  兔: 'rabbit',
  鸡: 'chicken',
  鸭: 'duck',
  鹅: 'goose',
  萼: 'calyx',
  杜: 'pear tree',
  杉: 'fir',
  杨: 'poplar',
  荚: 'pod',
  韭: 'leek',
  柯: 'branch',
  禾: 'grain',
  矛: 'spear',
  戟: 'halberd',
  绢: 'silk',
  斛: 'measure',
  网: 'net',
  骨: 'bone',
  肉: 'flesh',
  冈: 'ridge',
  秦: 'qin',
  筒: 'tube',
  萝: 'radish',
  葜: 'briar',
  血: 'blood',
  柃: 'shrub',
  芯: 'core',
  芒: 'awn',
  穗: 'ear',
  荷: 'lotus',
  莲: 'lotus',
  芦: 'reed',
  苇: 'reed',
  蒲: 'rush',
  莞: 'rush',
  薹: 'sedge',
  苞: 'bract',
  瓣: 'petal',
  蕊: 'stamen',
  梗: 'stalk',
  柄: 'stalk',
  蔓: 'creeper',
  须: 'whisker',
  髯: 'beard',
  冠: 'crown',
  盔: 'helmet',
  钟: 'bell',
  铃: 'bell',
  伞: 'umbrella',
  扇: 'fan',
  镰: 'sickle',
  锤: 'hammer',
  针: 'needle',
  线: 'thread',
  绳: 'rope',
  带: 'belt',
  囊: 'bag',
  袋: 'bag',
  壶: 'pot',
  碗: 'bowl',
  盘: 'plate',
  杯: 'cup',
  瓶: 'bottle',
  箱: 'box',
  柜: 'cabinet',
  床: 'bed',
  台: 'platform',
  塔: 'tower',
  桥: 'bridge',
  门: 'gate',
  窗: 'window',
  墙: 'wall',
  屋: 'house',
  船: 'boat',
  车: 'cart',
  轮: 'wheel',
  刀: 'knife',
  剑: 'sword',
  弓: 'bow',
  箭: 'arrow',
  盾: 'shield',
  甲: 'armor',
  旗: 'flag',
  鼓: 'drum',
  琴: 'zither',
  笛: 'flute',
  珠: 'pearl',
  宝: 'treasure',
  钱: 'coin',
  油: 'oil',
  蜡: 'wax',
  胶: 'glue',
  粉: 'powder',
  沙: 'sand',
  泥土: 'soil',
  灰: 'ash',
  烟: 'smoke',
  雾: 'fog',
  露: 'dew',
  霜: 'frost',
  雷: 'thunder',
  电: 'lightning',
  泉: 'spring',
  池: 'pond',
  湖: 'lake',
  溪: 'stream',
  滩: 'shoal',
  岸: 'shore',
  岛: 'island',
  谷: 'valley',
  坡: 'slope',
  崖: 'cliff',
  洞: 'cave',
  林: 'forest',
  丛: 'thicket',
  田: 'field',
  园: 'garden',
  路: 'road',
  墓: 'tomb',
  庙: 'temple',
  城: 'city',
  村: 'village',
  国: 'country',
  人: 'person',
  女: 'woman',
  男: 'man',
  儿: 'child',
  母: 'mother',
  父: 'father',
  王: 'king',
  僧: 'monk',
  仙: 'immortal',
  神: 'god',
  鬼: 'ghost',
  佛: 'buddha',
  龟: 'turtle',
  蛙: 'frog',
  蝶: 'butterfly',
  蜂: 'bee',
  蚁: 'ant',
  蛛: 'spider',
  蝎: 'scorpion',
  蚕: 'silkworm',
  螺: 'snail',
  蚌: 'clam',
  虾: 'shrimp',
  蟹: 'crab',
  鹤: 'crane',
  雀: 'sparrow',
  鹰: 'eagle',
  燕: 'swallow',
  鸽: 'dove',
  鹃: 'cuckoo',
  凤: 'phoenix',
  猴: 'monkey',
  象: 'elephant',
  狼: 'wolf',
  狐: 'fox',
  豹: 'leopard',
  犀: 'rhino',
  驼: 'camel',
  驴: 'donkey',
  骡: 'mule',
  鳞片: 'scale',
  翼: 'wing',
  爪: 'claw',
  蹄: 'hoof',
  喙: 'beak',
  肝: 'liver',
  肺: 'lung',
  肾: 'kidney',
  胃: 'stomach',
  肠: 'intestine',
  脑: 'brain',
  筋: 'sinew',
  脉: 'vein',
  汗: 'sweat',
  乳: 'milk',
  蜜: 'honey',
  糖: 'sugar',
  盐: 'salt',
  醋: 'vinegar',
  酒: 'wine',
  药: 'medicine',
  毒: 'poison',
  香料: 'spice',
  味: 'taste',
  色: 'color',
  形: 'shape',
  纹: 'pattern',
  斑: 'spot',
  点: 'dot',
  条: 'stripe',
  环: 'ring',
  节: 'joint',
  层: 'layer',
  面: 'face',
  边: 'edge',
  角落: 'corner',
  端: 'tip',
  底: 'bottom',
  侧: 'side',
  背: 'back',
  腹: 'belly',
  内: 'inside',
  外: 'outside',
  前: 'front',
  后: 'behind',
  左: 'left',
  右: 'right',
  近: 'near',
  远: 'far',
  重: 'heavy',
  轻: 'light',
  快: 'fast',
  慢: 'slow',
  强: 'strong',
  弱: 'weak',
  满: 'full',
  空: 'empty',
  净: 'clean',
  脏: 'dirty',
  美丽: 'beautiful',
  丑: 'ugly',
  奇: 'strange',
  common: 'common',
  普: 'common',
  珍: 'rare',
  毛茸: 'downy',
  光滑: 'smooth',
  粗: 'coarse',
  细: 'fine',
  嫩: 'tender',
  老化: 'aged',
  幼: 'young',
  壮: 'stout',
  瘦: 'thin',
  肥: 'fat',
  秃: 'bald',
  裸: 'naked',
  带刺: 'thorny',
}

/**
 * CHARACTERS THAT MUST NEVER CARRY A MEANING HERE.
 *
 * 氏 is the surname marker: 韩氏 is somebody called Han, 陈氏 somebody
 * called Chen. Unihan glosses it `clan, family` and that is correct
 * for the character and catastrophic for a plant name, because it
 * turns `Grimmia handelii`, named after a botanist, into a moss with
 * a clan.
 *
 * The others are the syllables Chinese spells foreign names with.
 * 克什米尔 is Kashmir, one sound per character, and every one of those
 * characters has an innocent dictionary meaning that has nothing to
 * do with anything.
 *
 * **Leaving them unglossed makes the reading FAIL, which is the right
 * answer.** The species stays honestly unnamed instead of being given
 * a description of a person.
 */
/**
 * **REFUSED BY CONTEXT, NOT BY CHARACTER.**
 *
 * The first version of this banned each syllable outright, and that
 * was measurably wrong. 布 is a transliteration syllable in a foreign
 * surname and it is also CLOTH: 布袋兰 is the cloth-bag orchid. 罗 is
 * a syllable and it is also GAUZE: 细罗藓 is the fine-gauze moss. 维
 * is a syllable and it is also FIBRE. Banning them cost 85 names that
 * were describing something.
 *
 * A syllable carrying sound rather than sense is recognisable by the
 * company it keeps, not by itself:
 *
 * ```text
 * 王氏黑藓          氏 marks the character before it as a surname
 * 克什米尔曲尾藓     four transliteration syllables in a row: Kashmir
 * 布袋兰            one such character, beside an ordinary word: cloth bag
 * ```
 *
 * So `氏` refuses the whole name it appears in, a RUN of two or more
 * of these syllables refuses the name, and a single one standing
 * beside ordinary words is read as the ordinary word it also is.
 */
const A_SURNAME = '氏'

const TRANSLIT = new Set([
  '尔', '克', '什', '洛', '斯', '尼', '娜', '夫', '维', '莫',
  '瑟', '佛', '甫', '德', '巴', '布', '蒂', '奇', '费', '弗', '贝',
  '罗', '里', '阿', '韦', '辛', '欧', '音', '仲', '爵', '萨', '喀',
  '噶', '汶', '聂', '霍', '准', '泸', '黎', '陈', '自', '鼎', '粤',
])

/** True when the string is carrying a name rather than a meaning. */
function isSaidName(han: string): boolean {
  if (han.includes(A_SURNAME)) return true
  let run = 0
  for (const ch of han) {
    run = TRANSLIT.has(ch) ? run + 1 : 0
    if (run >= 2) return true
  }
  return false
}

const means = new Map<string, string>(Object.entries(BY_HAND))

if (!existsSync(UNIHAN)) {
  process.stdout.write(
    `no Unihan at ${UNIHAN}\n` +
      `unzip it from land/base/datasets/unihan/Unihan.zip, or set UNIHAN\n`,
  )
  process.exit(0)
}

for (const line of readFileSync(UNIHAN, 'utf-8').split('\n')) {
  if (!line.startsWith('U+') || !line.includes('kDefinition')) continue
  const [code, , ...rest] = line.split('\t')
  const said = rest.join('\t').trim()
  if (!said || NOISE.test(said)) continue
  const one = said
    .split(/[;,]/)[0]
    .replace(/^to /, '')
    .replace(/^a /, '')
    .replace(/^an /, '')
    .trim()
    .toLowerCase()
  if (!one || one.split(/\s+/).length > 3) continue
  const at = Number.parseInt(code.slice(2), 16)
  if (!Number.isFinite(at)) continue
  const ch = String.fromCodePoint(at)
  // A hand answer is never overwritten by the dictionary.
  if (means.has(ch)) continue
  /**
   * The surname marker never means anything here. Every other
   * syllable keeps its dictionary meaning and is refused by CONTEXT
   * in `isSaidName` instead, since 布 is both a syllable of a foreign
   * name and the word for cloth.
   */
  if (ch === A_SURNAME) continue
  means.set(ch, one)
}

// ─── The Chinese names ─────────────────────────────────

/**
 * The genus word is dropped.
 *
 * `藻苔属` ends in 属, which means genus, and every genus name in the
 * file carries it. Keeping it would put `genus` in the literal
 * meaning of every plant on earth.
 */
const RANK = new Set(['属', '科', '目', '纲', '门', '界', '种', '亚'])

type Row = {
  latin: string
  han: string
  gloss: Array<string>
  /**
   * THE EPITHET HALF, WITH THE GENUS TAKEN OFF THE END.
   *
   * A Chinese plant name is built genus-last: 薹草 is the sedge, and
   * 广东薹草 is the Guangdong sedge, the epithet in front and the
   * genus repeated whole behind it. Reading the string as one lump
   * folds the genus into every one of its species.
   *
   * That is how `Carex adrienii` came out `moxroglgrasluflandgras`,
   * twenty-two letters, while `Carex alba` beside it came out
   * `dajgras wiq`. Same genus, two unrelated words, because one
   * species was named from the Latin and the other from the Chinese.
   * **A genus has one name, and which witness happened to fire for a
   * given species cannot be allowed to change it.**
   *
   * So the genus is cut off the end here, where both strings are in
   * hand, and the two halves are written separately.
   */
  head: string
  headGloss: Array<string>
}

const rows: Array<Row> = []
const seen = new Set<string>()

/** Every genus, read once: `Carex` to 薹草 to `sedge + grass`. */
type Kind = { latin: string; han: string; gloss: Array<string> }
const kinds = new Map<string, Kind>()

/** `name_code` to the binomial, so the folk-name file can be joined. */
const byCode = new Map<string, { latin: string; genus: string }>()

/** Read a Chinese string, or say which character stopped it. */
function readHan(han: string): Array<string> | undefined {
  /** A name in Chinese is refused for the same reason it is in Latin. */
  if (isSaidName(han)) return undefined
  const said: Array<string> = []
  for (const ch of [...han]) {
    if (RANK.has(ch)) continue
    const meant = means.get(ch)
    if (!meant) {
      unknown.set(ch, (unknown.get(ch) ?? 0) + 1)
      return undefined
    }
    said.push(meant)
  }
  return said.length ? said : undefined
}
const per = new Map<string, number>()
let noChar = 0
const unknown = new Map<string, number>()

for (const one of parse(readFileSync(resolve(PLANTS, FILE)), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.is_accepted_name !== '1') continue
  const genus = (one.genus ?? '').trim()
  const latin = `${genus} ${(one.species ?? '').trim()}`.trim()
  const han = (one.species_c ?? '').trim()
  if (!latin.includes(' ')) continue
  const code = (one.name_code ?? '').trim()
  if (code) byCode.set(code, { latin, genus })
  if (!han) continue
  if (seen.has(latin)) continue
  seen.add(latin)

  /**
   * The genus name carries the rank marker 属, which `RANK` drops, so
   * 薹草属 is 薹草 for both reading and stripping.
   */
  const kindHan = (one.genus_c ?? '').trim().replace(/[属科目纲门界种亚]+$/, '')
  if (genus && kindHan && !kinds.has(genus.toLowerCase())) {
    const saidKind = readHan(kindHan)
    if (saidKind) {
      kinds.set(genus.toLowerCase(), {
        latin: genus,
        han: kindHan,
        gloss: saidKind,
      })
    }
  }

  const said = readHan(han)
  if (!said) {
    noChar++
    continue
  }

  /**
   * The epithet is what is left once the genus is taken off the end.
   * When the species name IS the genus name, as it is for the type
   * species, there is no epithet half and the row carries none.
   */
  let head = ''
  let headGloss: Array<string> = []
  if (kindHan && han.endsWith(kindHan) && han.length > kindHan.length) {
    head = han.slice(0, han.length - kindHan.length)
    headGloss = readHan(head) ?? []
    if (!headGloss.length) head = ''
  }

  rows.push({ latin, han, gloss: said, head, headGloss })
  for (const meant of said) per.set(meant, (per.get(meant) ?? 0) + 1)
}

// ─── The folk names, joined on name_code ───────────────

type Folk = { latin: string; han: string; gloss: Array<string> }
const folk: Array<Folk> = []
const folkSeen = new Set<string>()
let folkRows = 0
try {
  for (const one of parse(readFileSync(resolve(PLANTS, FOLK)), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>) {
    if ((one.language ?? '').trim() !== 'Chinese') continue
    const at = byCode.get((one.name_code ?? '').trim())
    const said = (one.common_name ?? '').trim()
    if (!at || !said) continue
    folkRows++

    /**
     * A folk name carries the genus at the end the same way a formal
     * one does, so the same strip applies. Where the genus is not
     * there, the whole name stands as the epithet, which is right:
     * `白叶藓` is white-leaf moss and owes nothing to `Kiaeria`.
     */
    const kind = kinds.get(at.genus.toLowerCase())
    let head = said
    if (kind && said.endsWith(kind.han) && said.length > kind.han.length) {
      head = said.slice(0, said.length - kind.han.length)
    }
    const read = readHan(head)
    if (!read) continue
    /** One folk reading per species, the first that reads whole. */
    if (folkSeen.has(at.latin)) continue
    folkSeen.add(at.latin)
    folk.push({ latin: at.latin, han: head, gloss: read })
  }
} catch {
  // The folk file is optional.
}

// ─── Write it ──────────────────────────────────────────

const cell = (one: string) => `"${one.replace(/"/g, '""')}"`

writeFileSync(
  resolve(OUT, 'breakdown.csv'),
  'form,occurrences,cut,gloss,pieces,confidence,status,name_type,sources\n' +
    rows
      .map(one =>
        [
          cell(one.han),
          1,
          cell([...one.han].join(' + ')),
          cell(one.gloss.join(' + ')),
          one.gloss.length,
          0.75,
          'probable',
          'descriptive',
          cell('unihan'),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'gloss.csv'),
  'gloss,term,forms,occurrences,decided_by\n' +
    [...per.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([said, n]) => `${cell(said)},${cell(said)},${n},${n},unihan`)
      .join('\n') +
    '\n',
)

/** Where the Chinese and the Latin agree, which is the point. */
writeFileSync(
  resolve(OUT, 'chinese-name.csv'),
  'latin,chinese,literal,head,head_literal\n' +
    rows
      .map(one =>
        [
          cell(one.latin),
          cell(one.han),
          cell(one.gloss.join(' + ')),
          cell(one.head),
          cell(one.headGloss.join(' + ')),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

/** The folk epithet, genus already stripped where it was present. */
writeFileSync(
  resolve(OUT, 'chinese-folk.csv'),
  'latin,chinese,literal\n' +
    folk
      .map(one =>
        [cell(one.latin), cell(one.han), cell(one.gloss.join(' + '))].join(','),
      )
      .join('\n') +
    '\n',
)

/**
 * ONE ROW PER GENUS, so the genus is named once and every species
 * under it says the same word whichever witness names the species.
 */
writeFileSync(
  resolve(OUT, 'chinese-genus.csv'),
  'latin,chinese,literal\n' +
    [...kinds.values()]
      .map(one =>
        [cell(one.latin), cell(one.han), cell(one.gloss.join(' + '))].join(','),
      )
      .join('\n') +
    '\n',
)

const top = [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)

process.stdout.write(
  `THE CHINESE NAMES, READ\n\n` +
    `  characters known   ${means.size.toLocaleString()}\n` +
    `  species with one   ${seen.size.toLocaleString()}\n` +
    `  fully read         ${rows.length.toLocaleString()}\n` +
    `  folk names seen    ${folkRows.toLocaleString()}\n` +
    `  folk names read    ${folk.length.toLocaleString()}\n` +
    `  no character known ${noChar.toLocaleString()}\n\n` +
    `  THE CHARACTERS STOPPING THE MOST READINGS  (see --deep for more)\n\n` +
    [...unknown.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([ch, n]) => `  ${ch}  ${String(n).padStart(5)}\n`)
      .join('') +
    '\n' +
    `  WHAT CHINESE PLANT NAMES ARE BUILT OF\n\n` +
    top
      .map(([one, n]) => `  ${one.padEnd(22)}${String(n).padStart(6)}\n`)
      .join('') +
    `\n  A FEW, BESIDE THE LATIN\n\n` +
    rows
      .slice(0, 10)
      .map(one => `  ${one.latin.padEnd(30)}${one.han}   ${one.gloss.join(' + ')}\n`)
      .join('') +
    `\n  wrote ${OUT}/breakdown.csv, gloss.csv, chinese-name.csv\n`,
)
