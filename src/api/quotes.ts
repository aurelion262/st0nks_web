import { apiClient } from './client';

export interface QuoteData {
  symbol: string;
  close_price: number;
  reference_price: number;
  [key: string]: any; // Other fields from vnstock
}

export const quotesApi = {
  getQuotes: async (symbols: string[]): Promise<QuoteData[]> => {
    if (!symbols || symbols.length === 0) return [];
    
    try {
      const symbolsParam = symbols.join(',');
      const { data } = await apiClient.get<{ data: QuoteData[] }>(`/quotes?symbols=${symbolsParam}`);
      return data.data || [];
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
      return [];
    }
  },
};
