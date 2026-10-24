export async function loadReportLetterheadLogo(): Promise<string> {
  const response = await fetch('/assets/branding/report-letterhead-logo.png');
  if (!response.ok) {
    throw new Error(`Failed to load report letterhead logo: HTTP ${response.status}`);
  }

  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Failed to encode report letterhead logo.'));
        return;
      }
      resolve(reader.result);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read report letterhead logo.'));
    };
    reader.readAsDataURL(blob);
  });
}
