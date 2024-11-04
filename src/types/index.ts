export interface StockPrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: string;
}

export interface MarketMovers {
  gainers: {
    data: Array<{
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
    }>;
  };
  losers: {
    data: Array<{
      symbol: string;
      price: number;
      change: number;
      changePercent: number;
    }>;
  };
}
export interface AllIndices {
  key: string;
  index: string;
  last: number;
  percentChange: number;
  advances: string;
  declines: string;
}
export interface IpoDetails {
  companyName: string;
  metaInfo: MetaInfo;
  bidDetails: BidDetail[];
  issueInfo: IssueInfo;
  activeCat: ActiveCat;
  demandGraph: DemandGraph;
  demandDataNSE: any[];
  demandDataBSE: any[];
  demandGraphALL: DemandGraphAll;
}

export interface MetaInfo {
  symbol: string;
  companyName: string;
  industry: string;
  activeSeries: string[];
  debtSeries: any[];
  isFNOSec: boolean;
  isCASec: boolean;
  isSLBSec: boolean;
  isDebtSec: boolean;
  isSuspended: boolean;
  tempSuspendedSeries: any[];
  isETFSec: boolean;
  isDelisted: boolean;
  isin: string;
  slb_isin: string;
  isMunicipalBond: boolean;
  quotepreopenstatus: Quotepreopenstatus;
}

export interface Quotepreopenstatus {
  equityTime: string;
  preOpenTime: string;
  QuotePreOpenFlag: boolean;
}

export interface BidDetail {
  srNo: any;
  category: string;
  noOfSharesOffered: string;
  noOfsharesBid: string;
  noOfTime: string;
}

export interface IssueInfo {}

export interface ActiveCat {
  symbol: any;
  heading: any;
  updateTime: string;
  dataList: DataList[];
}

export interface DataList {
  srNo?: string;
  category: string;
  noOfShareOffered: string;
  noOfSharesBid: string;
  noOfTotalMeant: string;
}

export interface DemandGraph {
  noOfShare: string;
  totalIssueSize: string;
  note: string;
  heading1: string;
  heading2: string;
  plotData: PlotData;
  graphData: any[];
}

export interface PlotData {}

export interface DemandGraphAll {
  noOfShare: string;
  totalIssueSize: string;
  note: string;
  heading1: string;
  heading2: string;
  plotData: PlotData2;
  graphData: any[];
}

export interface PlotData2 {}
export interface CorporateInfo {
  latest_announcements: LatestAnnouncements;
  corporate_actions: CorporateActions;
  shareholdings_patterns: ShareholdingsPatterns;
  financial_results: FinancialResults;
  borad_meeting: BoradMeeting;
}

export interface BoradMeeting {
  data: BoradMeetingDatum[];
}

export interface BoradMeetingDatum {
  symbol: string;
  purpose: string;
  meetingdate: string;
}

export interface CorporateActions {
  data: CorporateActionsDatum[];
}

export interface CorporateActionsDatum {
  symbol: string;
  exdate: string;
  purpose: string;
}

export interface FinancialResults {
  data: FinancialResultsDatum[];
}

export interface FinancialResultsDatum {
  from_date: string;
  to_date: string;
  expenditure: string;
  income: string;
  audited: string;
  cumulative: string;
  consolidated: string;
  reDilEPS: string;
  reProLossBefTax: string;
  proLossAftTax: string;
  re_broadcast_timestamp: string;
  xbrl_attachment: string;
  na_attachment: string;
}

export interface LatestAnnouncements {
  data: LatestAnnouncementsDatum[];
}

export interface LatestAnnouncementsDatum {
  symbol: string;
  broadcastdate: string;
  subject: string;
}

export interface ShareholdingsPatterns {
  data: { [key: string]: ShareholdingsPatternsDatum[] };
}

export interface ShareholdingsPatternsDatum {
  "Promoter & Promoter Group"?: string;
  Public?: string;
  "Shares held by Employee Trusts"?: string;
  Total?: string;
}
