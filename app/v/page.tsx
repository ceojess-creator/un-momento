import { redirect } from 'next/navigation';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId:     process.env.CLOUDFLARE_R2_ACCESS_KEY!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY!,
  },
});

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ media?: string }> }) {
  const { media: mediaId } = await searchParams;

  if (!mediaId) redirect('https://unmomentoprints.com');

  const extensions = ['mp4', 'mov', 'webm', 'm4v', 'mp3', 'm4a', 'wav'];
  let signedUrl:  string | null = null;
  let matchedKey: string | null = null;

  for (const ext of extensions) {
    const key = `media/${mediaId}.${ext}`;
    try {
      await s3.send(new HeadObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
        Key:    key,
      }));
      signedUrl = await getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.CLOUDFLARE_R2_BUCKET!,
        Key:    key,
      }), { expiresIn: 3600 });
      matchedKey = key;
      break;
    } catch {
      continue;
    }
  }

  if (!signedUrl || !matchedKey) {
    return (
      <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', padding:24 }}>
        <div style={{ fontSize:48, marginBottom:16 }}>🎓</div>
        <h1 style={{ fontSize:22, fontWeight:700, marginBottom:8 }}>Un Momento</h1>
        <p style={{ color:'#666', textAlign:'center' }}>This memory isn't available yet — check back soon!</p>
      </div>
    );
  }

  const isVideo = matchedKey.match(/\.(mp4|mov|webm|m4v)$/i);
  const isAudio = matchedKey.match(/\.(mp3|m4a|wav|ogg|aac)$/i);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'sans-serif', padding:24 }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <div style={{ textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:40, marginBottom:8 }}>🎓</div>
          <h1 style={{ fontSize:22, fontWeight:700, margin:'0 0 4px' }}>Un Momento</h1>
          <p style={{ color:'#888', fontSize:14, margin:0 }}>Your graduation memory</p>
        </div>
        {isVideo && (
          <video src={signedUrl} controls autoPlay playsInline
            style={{ width:'100%', borderRadius:12, background:'#111', marginBottom:16 }}
          />
        )}
        {isAudio && (
          <div style={{ background:'#111', borderRadius:12, padding:24, marginBottom:16, textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>🎙️</div>
            <audio src={signedUrl} controls style={{ width:'100%' }} />
          </div>
        )}
        <div style={{ textAlign:'center', marginTop:16 }}>
          <a href="https://unmomentoprints.com" style={{ color:'#4ADE80', fontSize:13, textDecoration:'none' }}>
            unmomentoprints.com
          </a>
        </div>
      </div>
    </div>
  );
}
