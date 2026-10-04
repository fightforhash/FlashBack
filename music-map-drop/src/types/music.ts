export interface ItunesSong {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl?: string;
  collectionName?: string;
  trackTimeMillis?: number;
  primaryGenreName?: string;
}

export interface ItunesResponse {
  resultCount: number;
  results: ItunesSong[];
}

