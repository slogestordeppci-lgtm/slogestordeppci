import { jsPDF } from 'jspdf';

export const addStandardHeader = (doc: jsPDF, data: any, title: string) => {
  const companyName = data.companyName || "SLO – Engenharia de Segurança Contra Incêndio LTDA";
  const companyCnpj = data.companyCnpj || "64.610.803/0001-40";
  const companyAddress = data.companyAddress || "Rua João Sarmento, 987 - Centro, Osório/RS";
  const companyCep = data.companyCep || "94.660-186";
  const companyPhone = data.companyPhone || "(51) 9 9919-1194";
  const companyEmail = data.companyEmail || "sloprevencao.adm@gmail.com";

  if (data.logoUrl) {
    try {
      let imgType = 'PNG';
      if (data.logoUrl.includes('image/jpeg') || data.logoUrl.includes('image/jpg')) {
        imgType = 'JPEG';
      } else if (data.logoUrl.includes('image/webp')) {
        imgType = 'WEBP';
      }
      doc.addImage(data.logoUrl, imgType, 50, 12, 110, 28, undefined, 'FAST');
    } catch (err) {
      console.error("Erro ao adicionar logo ao PDF:", err);
    }
  }

  doc.setFillColor(241, 156, 121); // Peach-orange
  doc.rect(14, 46, 182, 8, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0); 
  doc.text(title.toUpperCase(), 105, 51, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(185, 28, 28); 
  doc.text("EMISSOR:", 14, 59);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(14, 60, 182, 24);

  doc.setFontSize(8);
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.text("Razão Social:", 16, 65);
  doc.setFont('helvetica', 'normal');
  doc.text(companyName, 38, 65);

  doc.setFont('helvetica', 'bold');
  doc.text("CNPJ:", 16, 70);
  doc.setFont('helvetica', 'normal');
  doc.text(companyCnpj, 26, 70);

  doc.setFont('helvetica', 'bold');
  doc.text("Endereço:", 16, 75);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyAddress} - CEP: ${companyCep}`, 32, 75);

  doc.setFont('helvetica', 'bold');
  doc.text("Contato:", 16, 80);
  doc.setFont('helvetica', 'normal');
  doc.text(`${companyPhone} / ${companyEmail}`, 30, 80);

  return 90; // Returns the current Y position for subsequent content
};

export const addStandardFooter = (doc: jsPDF, data: any) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const companyPhone = data.companyPhone || "(51) 9 9919-1194";
  const companyEmail = data.companyEmail || "sloprevencao.adm@gmail.com";
  const companyAddress = data.companyAddress || "Rua João Sarmento, 987 - Centro, Osório/RS";

  doc.setFillColor(185, 28, 28);
  doc.rect(0, pageHeight - 15, 210, 15, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`${companyPhone}    |    ${companyEmail}    |    ${companyAddress}`, 105, pageHeight - 6, { align: 'center' });
};
