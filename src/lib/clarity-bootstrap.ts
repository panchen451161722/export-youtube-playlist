/**
 * Clarity's project Cookies switch must be on. Its regional defaults still
 * require consent in the EEA, UK and Switzerland. Never synthesize a "granted"
 * signal from a visitor's location or a prior page view.
 */
export function clarityBootstrap(projectId: string): string | null {
  const id = projectId.trim();
  if (!/^[a-z0-9]+$/i.test(id)) return null;

  return `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};var denied=false;try{denied=c.localStorage.getItem("clarity_consent")==="denied"}catch(e){}var n=c.navigator||{};if(denied||n.globalPrivacyControl===true||n.doNotTrack==="1"){c[a]("consentv2",{ad_Storage:"denied",analytics_Storage:"denied"})}t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${id}");`;
}
