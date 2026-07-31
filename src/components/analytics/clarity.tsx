export function Clarity({ projectId }: { projectId: string }) {
  const normalizedProjectId = projectId.trim();
  if (!/^[a-z0-9]+$/i.test(normalizedProjectId)) return null;

  return (
    <script
      id="clarity-init"
      async
      dangerouslySetInnerHTML={{
        __html: `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};try{c.localStorage.removeItem("clarity_consent")}catch(e){}c[a]("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"});t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${normalizedProjectId}");`,
      }}
    />
  );
}
