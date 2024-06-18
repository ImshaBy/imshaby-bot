
export interface IParishLookupParameters {
    keyword: string;
    id: string;
    language: 'ru' | 'en' | 'be' | 'pl';
}

export interface IParishResult {
    id: string;
    title: string;
    broadcastUrl: string;
    address: string;
    needUpdate: boolean;
    lastMassActualDate: string;
    lastModifiedDate: string;
    phone: string;
    key: string;
    email: string;
    website: string;
    updatePeriodInDays: number;
    imgPath: string;

}

export interface IMassDay {
    date: string;
    dayOfweek: string;
    massHours: string[];
}

export interface IExpiredParish {
  name: string;
  shortName: string;
  id: string;
  key: string;
  updatePeriodInDays: number;
  lastConfirmRelevance: string;
}

export enum EXPIRED_PARISHES {
  EXPIRED = 'expired',
  ALMOST_EXPIRED = 'almost_expired',
}

type Provider = (params: IParishLookupParameters) => Promise<IParishResult[]>;

// Filter search result so that only fresh movie will be visible. Used as currentYear - number


export const parishSearch = {
};
