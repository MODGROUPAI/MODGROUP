'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PipelineRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/leads/pipeline'); }, [router]);
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', color:'var(--text-3)', fontSize:14 }}>
      Reindirizzamento a Pipeline...
    </div>
  );
}
