export interface Metadata {
    title: string;
    artist: string;
    album: string;
    artwork?: string;
    listeners?: number;
    source: string;
}

// Parse Icecast JSON response
export function parseIcecastMetadata(data: any, mount: string): Metadata | null {
    try {
        const icestats = data.icestats;
        if (!icestats || !icestats.source) return null;

        let source = icestats.source;
        if (Array.isArray(source)) {
            source = source.find((s: any) => s.listenurl?.includes(mount)) || source[0];
        }

        if (source) {
            const title = source.title || source.yp_currently_playing || '';
            const parts = title.split(' - ');
            return {
                title: parts.length > 1 ? parts[1] : title,
                artist: parts.length > 1 ? parts[0] : 'Unknown Artist',
                album: source.genre || 'Live Stream',
                listeners: source.listeners,
                source: 'icecast'
            };
        }
    } catch (e) {
        console.error('Error parsing Icecast metadata:', e);
    }
    return null;
}

// Parse Zeno FM metadata
export function parseZenoMetadata(data: any): Metadata | null {
    try {
        if (data && (data.title || data.artist)) {
            return {
                title: data.title || 'Unknown Title',
                artist: data.artist || 'Unknown Artist',
                album: data.album || 'Live Stream',
                artwork: data.artwork,
                source: 'zeno'
            };
        }
    } catch (e) {
        console.error('Error parsing Zeno metadata:', e);
    }
    return null;
}

// Parse RadioJar metadata
export function parseRadioJarMetadata(data: any): Metadata | null {
    try {
        if (data) {
            return {
                title: data.title || data.name || 'Unknown Title',
                artist: data.artist || 'Unknown Artist',
                album: data.album || 'Live Stream',
                artwork: data.image_url || data.artwork,
                source: 'radiojar'
            };
        }
    } catch (e) {
        console.error('Error parsing RadioJar metadata:', e);
    }
    return null;
}

// Parse Shoutcast currentsong (plain text format: "ARTIST - TITLE")
export function parseShoutcastCurrentsong(text: string, defaultArtist: string = 'Unknown Station'): Metadata | null {
    try {
        if (text && typeof text === 'string') {
            const parts = text.trim().split(' - ');
            if (parts.length >= 2) {
                return {
                    title: parts.slice(1).join(' - ').trim(),
                    artist: parts[0].trim(),
                    album: 'Top 40',
                    source: 'shoutcast'
                };
            } else {
                return {
                    title: text.trim(),
                    artist: defaultArtist,
                    album: 'Top 40',
                    source: 'shoutcast'
                };
            }
        }
    } catch (e) {
        console.error('Error parsing Shoutcast currentsong:', e);
    }
    return null;
}

