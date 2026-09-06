import type {
  BudgetLevel,
  DestinationTheme,
  FoodCategory,
  FoodCondition,
  Nutrition,
  Season,
} from '@/lib/data/types'

export const THEME_LABEL: Record<DestinationTheme, string> = {
  sea: '바다',
  mountain: '산',
  city: '도시',
  healing: '힐링',
  activity: '액티비티',
}

export const BUDGET_LABEL: Record<BudgetLevel, string> = {
  low: '알뜰',
  mid: '보통',
  high: '플렉스',
}

export const SEASON_LABEL: Record<Season, string> = {
  spring: '봄',
  summer: '여름',
  autumn: '가을',
  winter: '겨울',
}

export const THEME_ORDER: readonly DestinationTheme[] = [
  'sea',
  'mountain',
  'city',
  'healing',
  'activity',
]

export const BUDGET_ORDER: readonly BudgetLevel[] = ['low', 'mid', 'high']

export const SEASON_ORDER: readonly Season[] = [
  'spring',
  'summer',
  'autumn',
  'winter',
]

export const FOOD_CATEGORY_LABEL: Record<FoodCategory, string> = {
  korean: '한식',
  chinese: '중식',
  japanese: '일식',
  western: '양식',
  bunsik: '분식',
  fastfood: '패스트푸드',
  asian: '아시안',
  salad: '샐러드',
  dessert: '디저트',
  beverage: '음료',
}

export const FOOD_CATEGORY_ORDER: readonly FoodCategory[] = [
  'korean',
  'chinese',
  'japanese',
  'western',
  'bunsik',
  'fastfood',
  'asian',
  'salad',
  'dessert',
  'beverage',
]

export const FOOD_CONDITION_LABEL: Record<FoodCondition, string> = {
  cold: '추운 날',
  hot: '더운 날',
  tired: '피곤할 때',
  stress: '스트레스 받을 때',
  hangover: '숙취 해소',
  sick: '몸이 아플 때',
  alcohol: '술 한잔',
  cheap: '가성비',
  diet: '다이어트 중',
  special: '특별한 날',
}

/**
 * 컨디션 칩을 세 무리로 나눠 보여 준다. 무리는 표시용 묶음일 뿐이고
 * 판정은 전체 OR이다 (lib/foods/filter.ts). 열 개를 한 줄에 늘어놓으면
 * 무엇을 고르는 화면인지 읽히지 않아 나눴을 뿐, 축이 셋이라는 뜻이 아니다.
 */
export const FOOD_CONDITION_GROUPS: readonly {
  label: string
  conditions: readonly FoodCondition[]
}[] = [
  { label: '날씨', conditions: ['cold', 'hot'] },
  { label: '몸 상태', conditions: ['tired', 'stress', 'hangover', 'sick'] },
  { label: '상황', conditions: ['alcohol', 'cheap', 'diet', 'special'] },
]

/** 영양성분 표시 이름과 단위. 순서는 lib/foods/nutrition.ts의 NUTRIENT_ORDER가 갖는다. */
export const NUTRIENT_LABEL: Record<
  keyof Nutrition,
  { name: string; unit: string }
> = {
  kcal: { name: '열량', unit: 'kcal' },
  carbsG: { name: '탄수화물', unit: 'g' },
  proteinG: { name: '단백질', unit: 'g' },
  fatG: { name: '지방', unit: 'g' },
  sodiumMg: { name: '나트륨', unit: 'mg' },
}

/**
 * 지도 데이터(korea-sigungu.json)는 시도 정식 명칭을, 여행지 데이터는 축약 키를 쓴다.
 * 둘을 잇는 유일한 표. 표에 없는 값이 들어오면 여행지 조회를 건너뛴다.
 */
export const PROVINCE_TO_REGION: Record<string, string> = {
  서울특별시: '서울',
  부산광역시: '부산',
  대구광역시: '대구',
  인천광역시: '인천',
  광주광역시: '광주',
  대전광역시: '대전',
  울산광역시: '울산',
  세종특별자치시: '세종',
  경기도: '경기',
  강원특별자치도: '강원',
  충청북도: '충북',
  충청남도: '충남',
  전북특별자치도: '전북',
  전라남도: '전남',
  경상북도: '경북',
  경상남도: '경남',
  제주특별자치도: '제주',
}

/**
 * 분류를 나타내는 뱃지는 전부 이 중립 pill을 쓴다. 강조색은 초록 하나뿐이라
 * 테마·음식 종류마다 색을 주지 않는다. 어차피 색만으로 정보를 전달하면 안 되므로
 * 구분은 라벨이 한다. (DESIGN_SYSTEM §4)
 */
export const NEUTRAL_PILL = 'bg-ink/5 text-ink'

export const THEME_PILL = NEUTRAL_PILL
