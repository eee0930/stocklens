// 한국 주요 상장 종목 매핑 (한글명 → Yahoo Finance 티커)
// KOSPI: .KS  /  KOSDAQ: .KQ

const KR_MAP = [
  // ── 반도체 / IT
  { names: ['삼성전자', '삼성 전자'],             symbol: '005930.KS', shortname: '삼성전자' },
  { names: ['sk하이닉스', 'sk 하이닉스', '하이닉스'], symbol: '000660.KS', shortname: 'SK하이닉스' },
  { names: ['삼성전기'],                          symbol: '009150.KS', shortname: '삼성전기' },
  { names: ['삼성sds', '삼성 sds'],              symbol: '018260.KS', shortname: '삼성SDS' },
  { names: ['lg전자', 'lg 전자'],                symbol: '066570.KS', shortname: 'LG전자' },
  { names: ['lg이노텍', 'lg 이노텍'],             symbol: '011070.KS', shortname: 'LG이노텍' },

  // ── 인터넷 / 플랫폼
  { names: ['네이버', 'naver'],                  symbol: '035420.KS', shortname: 'NAVER' },
  { names: ['카카오'],                            symbol: '035720.KS', shortname: '카카오' },
  { names: ['카카오뱅크'],                        symbol: '323410.KS', shortname: '카카오뱅크' },
  { names: ['카카오페이'],                        symbol: '377300.KS', shortname: '카카오페이' },

  // ── 2차전지 / 에너지
  { names: ['lg에너지솔루션', 'lg 에너지솔루션'], symbol: '373220.KS', shortname: 'LG에너지솔루션' },
  { names: ['삼성sdi', '삼성 sdi'],              symbol: '006400.KS', shortname: '삼성SDI' },
  { names: ['lg화학', 'lg 화학'],                symbol: '051910.KS', shortname: 'LG화학' },
  { names: ['에코프로비엠', '에코프로 비엠'],      symbol: '247540.KQ', shortname: '에코프로비엠' },
  { names: ['에코프로'],                          symbol: '086520.KQ', shortname: '에코프로' },
  { names: ['포스코퓨처엠', '포스코 퓨처엠'],     symbol: '003670.KS', shortname: '포스코퓨처엠' },
  { names: ['한화솔루션'],                        symbol: '009830.KS', shortname: '한화솔루션' },
  { names: ['sk이노베이션', 'sk 이노베이션'],     symbol: '096770.KS', shortname: 'SK이노베이션' },

  // ── 자동차
  { names: ['현대차', '현대자동차'],              symbol: '005380.KS', shortname: '현대차' },
  { names: ['기아', '기아자동차'],               symbol: '000270.KS', shortname: '기아' },
  { names: ['현대모비스'],                        symbol: '012330.KS', shortname: '현대모비스' },
  { names: ['현대위아'],                          symbol: '011210.KS', shortname: '현대위아' },

  // ── 조선 / 중공업
  { names: ['hd현대중공업', 'hd 현대중공업'],    symbol: '329180.KS', shortname: 'HD현대중공업' },
  { names: ['한국조선해양'],                      symbol: '009540.KS', shortname: '한국조선해양' },
  { names: ['삼성중공업'],                        symbol: '010140.KS', shortname: '삼성중공업' },
  { names: ['두산에너빌리티'],                    symbol: '034020.KS', shortname: '두산에너빌리티' },
  { names: ['두산로보틱스'],                      symbol: '454910.KS', shortname: '두산로보틱스' },
  { names: ['hd현대', 'hd 현대'],                symbol: '267250.KS', shortname: 'HD현대' },

  // ── 철강 / 소재
  { names: ['포스코홀딩스', '포스코'],            symbol: '005490.KS', shortname: '포스코홀딩스' },
  { names: ['고려아연'],                          symbol: '010130.KS', shortname: '고려아연' },
  { names: ['현대제철'],                          symbol: '004020.KS', shortname: '현대제철' },

  // ── 금융
  { names: ['kb금융', 'kb 금융', '국민은행'],    symbol: '105560.KS', shortname: 'KB금융' },
  { names: ['신한지주', '신한금융'],              symbol: '055550.KS', shortname: '신한지주' },
  { names: ['하나금융지주', '하나금융'],          symbol: '086790.KS', shortname: '하나금융지주' },
  { names: ['우리금융지주', '우리금융'],          symbol: '316140.KS', shortname: '우리금융지주' },
  { names: ['삼성생명'],                          symbol: '032830.KS', shortname: '삼성생명' },
  { names: ['삼성화재'],                          symbol: '000810.KS', shortname: '삼성화재' },
  { names: ['미래에셋증권'],                      symbol: '006800.KS', shortname: '미래에셋증권' },

  // ── 바이오 / 헬스케어
  { names: ['삼성바이오로직스', '삼성 바이오'],   symbol: '207940.KS', shortname: '삼성바이오로직스' },
  { names: ['셀트리온'],                          symbol: '068270.KS', shortname: '셀트리온' },
  { names: ['유한양행'],                          symbol: '000100.KS', shortname: '유한양행' },
  { names: ['한미약품'],                          symbol: '128940.KS', shortname: '한미약품' },
  { names: ['알테오젠'],                          symbol: '196170.KQ', shortname: '알테오젠' },

  // ── 게임
  { names: ['크래프톤'],                          symbol: '259960.KS', shortname: '크래프톤' },
  { names: ['엔씨소프트', '엔씨'],               symbol: '036570.KS', shortname: '엔씨소프트' },
  { names: ['넷마블'],                            symbol: '251270.KS', shortname: '넷마블' },
  { names: ['펄어비스'],                          symbol: '263750.KQ', shortname: '펄어비스' },
  { names: ['카카오게임즈'],                      symbol: '293490.KQ', shortname: '카카오게임즈' },

  // ── 통신
  { names: ['sk텔레콤', 'skt'],                  symbol: '017670.KS', shortname: 'SK텔레콤' },
  { names: ['kt', 'kt주식'],                     symbol: '030200.KS', shortname: 'KT' },
  { names: ['lg유플러스', 'lgu+'],               symbol: '032640.KS', shortname: 'LG유플러스' },

  // ── 유통 / 소비재
  { names: ['삼성물산'],                          symbol: '028260.KS', shortname: '삼성물산' },
  { names: ['아모레퍼시픽', '아모레'],            symbol: '090430.KS', shortname: '아모레퍼시픽' },
  { names: ['lg생활건강'],                        symbol: '051900.KS', shortname: 'LG생활건강' },
  { names: ['cj제일제당', 'cj 제일제당'],        symbol: '097950.KS', shortname: 'CJ제일제당' },
  { names: ['오리온'],                            symbol: '271560.KS', shortname: '오리온' },
  { names: ['롯데케미칼'],                        symbol: '011170.KS', shortname: '롯데케미칼' },

  // ── 항공 / 운송
  { names: ['대한항공'],                          symbol: '003490.KS', shortname: '대한항공' },
  { names: ['hmm', '현대상선'],                  symbol: '011200.KS', shortname: 'HMM' },

  // ── 건설 / 인프라
  { names: ['현대건설'],                          symbol: '000720.KS', shortname: '현대건설' },
  { names: ['gs건설'],                            symbol: '006360.KS', shortname: 'GS건설' },
  { names: ['한국전력', '한전'],                  symbol: '015760.KS', shortname: '한국전력' },

  // ── AI / 로봇
  { names: ['레인보우로보틱스'],                  symbol: '277810.KQ', shortname: '레인보우로보틱스' },
  { names: ['한화로보틱스'],                      symbol: '012450.KS', shortname: '한화에어로스페이스' },
  { names: ['리노공업'],                          symbol: '058470.KQ', shortname: '리노공업' },

  // ── 국내 ETF (미국 지수 추종)
  { names: ['kodex 미국나스닥100', 'kodex 나스닥100', '코덱스 나스닥100', '코덱스 미국나스닥100'], symbol: '379800.KS', shortname: 'KODEX 미국나스닥100' },
  { names: ['tiger 미국s&p500', 'tiger s&p500', '타이거 s&p500', '타이거 미국s&p500'],            symbol: '360750.KS', shortname: 'TIGER 미국S&P500' },
  { names: ['kodex 200', '코덱스 200'],           symbol: '069500.KS', shortname: 'KODEX 200' },
  { names: ['tiger 200', '타이거 200'],           symbol: '102110.KS', shortname: 'TIGER 200' },
]

// 한글 포함 여부 판별
export function isKorean(query) {
  return /[가-힣ㄱ-ㆎ]/.test(query)
}

// 한글 쿼리 → 매핑 결과 반환 (Yahoo Finance search 결과 형식과 동일)
export function searchKoreanStocks(query) {
  const q = query.trim().toLowerCase().replace(/\s+/g, '')
  if (!q) return []

  const results = []
  for (const stock of KR_MAP) {
    const matched = stock.names.some(name => {
      const n = name.toLowerCase().replace(/\s+/g, '')
      return n.includes(q) || q.includes(n)
    })
    if (matched) {
      results.push({
        symbol:    stock.symbol,
        shortname: stock.shortname,
        longname:  stock.shortname,
        quoteType: 'EQUITY',
        exchange:  stock.symbol.endsWith('.KQ') ? 'KOE' : 'KSC',
      })
    }
  }
  return results
}
