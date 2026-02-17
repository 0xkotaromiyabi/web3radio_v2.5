export interface Station {
    id: string;
    name: string;
    streamUrl: string;
    genre: string;
    description: string;
    image_url: string;
    metadataUrl?: string;
    type?: 'shoutcast' | 'icecast' | 'radiojar' | 'plain' | 'zeno';
    mount?: string;
}

export const STATIONS: Station[] = [
    {
        id: 'web3',
        name: 'Web3 Radio',
        streamUrl: 'https://shoutcast.webthreeradio.xyz/stream',
        genre: 'Electronic',
        description: 'The Future of Radio',
        image_url: 'https://webthreeradio.xyz/assets/web3radio-logo.png',
        metadataUrl: 'https://shoutcast.webthreeradio.xyz/currentsong?sid=1',
        type: 'shoutcast',
        mount: '/stream'
    },
    {
        id: 'ozradio',
        name: 'Oz Radio Jakarta',
        streamUrl: 'https://streaming.ozradiojakarta.com:8443/oz_jakarta',
        genre: 'Top 40',
        description: 'Oz Radio Jakarta',
        image_url: 'https://www.ozradiojakarta.com/wp-content/uploads/2023/10/Oz-Radio-Jakarta-Logo.png',
        metadataUrl: 'https://streaming.ozradiojakarta.com:8443/status-json.xsl',
        type: 'icecast',
        mount: '/ozjakarta'
    },
    {
        id: 'iradio',
        name: 'i-Radio',
        streamUrl: 'https://stream.radiojar.com/4ywdgup3bnzuv',
        genre: 'Indonesian Pop',
        description: '100% Musik Indonesia',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/I-Radio_Jakarta_Logo.png/800px-I-Radio_Jakarta_Logo.png',
        metadataUrl: 'https://api.radiojar.com/api/stations/4ywdgup3bnzuv/now_playing/',
        type: 'radiojar'
    },
    {
        id: 'female',
        name: 'Female Radio',
        streamUrl: 'https://s1.cloudmu.id/listen/female_radio/radio',
        genre: 'Adult Contemporary',
        description: 'Love Life, Love Music',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Female_Radio_Logo.png',
        metadataUrl: 'https://s1.cloudmu.id/listen/female_radio/currentsong?sid=1',
        type: 'shoutcast'
    },
    {
        id: 'delta',
        name: 'Delta FM',
        streamUrl: 'https://s1.cloudmu.id/listen/delta_fm/radio',
        genre: 'Easy Listening',
        description: 'Lagu Enak',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c8/Delta_FM_Logo.png/640px-Delta_FM_Logo.png',
        metadataUrl: 'https://s1.cloudmu.id/listen/delta_fm/currentsong?sid=1',
        type: 'shoutcast'
    },
    {
        id: 'prambors',
        name: 'Prambors FM',
        streamUrl: 'https://s2.cloudmu.id/listen/prambors/radio',
        genre: 'Top 40',
        description: 'Indonesia No. 1 Hit Music Station',
        image_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Prambors_FM_Logo.png/1200px-Prambors_FM_Logo.png',
        metadataUrl: 'https://s2.cloudmu.id/listen/prambors/currentsong?sid=1',
        type: 'shoutcast'
    }
];

export const getStationById = (id: string) => STATIONS.find(s => s.id === id);
