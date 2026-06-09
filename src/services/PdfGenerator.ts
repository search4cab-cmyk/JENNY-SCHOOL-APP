import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import QRCode from 'qrcode';

export class PdfGenerator {
  static async createReceipt(data: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Digital Stamp (Background Watermark)
    const stampDataUrl = this.generateDigitalStamp('JENNY SCHOOL ROAD SECURITY RECORD', 'VERIFIED RECEIPT');
    doc.setGState(new (doc.GState as any)({ opacity: 0.1 }));
    doc.addImage(stampDataUrl, 'PNG', 40, 80, 130, 130);
    doc.setGState(new (doc.GState as any)({ opacity: 1.0 }));

    // Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('JENNY SCHOOL ROAD SECURITY RECORD', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Landlord Association', pageWidth / 2, 27, { align: 'center' });
    doc.text('Ekete Waterside, Udu Road, Nigeria', pageWidth / 2, 33, { align: 'center' });

    doc.setLineWidth(0.5);
    doc.line(14, 38, pageWidth - 14, 38);

    // Receipt Info
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth / 2, 48, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Receipt Number: ${data.receiptNumber}`, 14, 60);
    doc.text(`Transaction ID: ${data.transactionId}`, 14, 66);
    doc.text(`Date: ${data.paymentDate}`, 14, 72);
    
    // Generate QR Code
    try {
      const qrDataUrl = await QRCode.toDataURL(data.transactionId);
      doc.addImage(qrDataUrl, 'PNG', pageWidth - 45, 55, 30, 30);
    } catch (err) {
      console.warn('QR Code generation failed', err);
    }

    // Landlord Info Box
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(14, 85, pageWidth - 28, 35, 3, 3, 'FD');
    
    doc.setFont('helvetica', 'bold');
    doc.text('RECEIVED FROM:', 18, 93);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${data.landlordName}`, 18, 100);
    doc.text(`Compound: ${data.compoundName}`, 18, 106);
    doc.text(`Phone: ${data.phoneNumber || 'N/A'}`, 18, 112);

    // Payment Details Table
    autoTable(doc, {
      startY: 130,
      head: [['Description', 'Amount (₦)']],
      body: [
        ['Monthly Levy Amount', data.monthlyLevy.toLocaleString()],
        ['Payment Period Covered', data.periodCovered],
        [`Amount Paid (${data.paymentMonths.length} Months)`, data.amountPaid.toLocaleString()],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Outstanding Balance Section
    doc.setFont('helvetica', 'bold');
    doc.text('OUTSTANDING BALANCE STATEMENT', 14, finalY);
    
    if (data.outstandingMonths.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(16, 185, 129); // Success Green
      doc.text('ACCOUNT IS UP TO DATE - NO OUTSTANDING ARREARS', 14, finalY + 8);
      doc.setTextColor(0, 0, 0);
    } else {
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Overdue Months (Up to Current Date)', 'Arrears (₦)']],
        body: data.outstandingMonths.map((m: any) => [m.month, m.amount.toLocaleString()]),
        foot: [['Total Outstanding', data.totalOutstanding.toLocaleString()]],
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] }, // Danger Red
        footStyles: { fillColor: [250, 250, 250], textColor: [0, 0, 0], fontStyle: 'bold' },
        margin: { left: 14, right: 14 }
      });
    }

    const nextY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : finalY + 20;

    // Bank Details
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(79, 70, 229);
    doc.rect(14, nextY, pageWidth - 28, 25, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('ESTATE PAYMENT ACCOUNT:', 18, nextY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`Account Name: ${data.settings?.bank_account_name || 'Umude Anointing'}  |  Account Number: ${data.settings?.bank_account_number || '0257831096'}  |  Bank: ${data.settings?.bank_name || 'GTBank'}`, 18, nextY + 15);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('Notice: After payment please post receipt on the Group Chat. THANK YOU.', 18, nextY + 22);

    // Signatures
    doc.setTextColor(0, 0, 0);
    const sigY = nextY + 45;
    
    const treasurerName = data.settings?.treasurer_name || 'Anointing Umude';
    const managerName = data.settings?.manager_name || 'Mr Macurley';

    const treasurerSig = this.generateSignature(treasurerName);
    doc.addImage(treasurerSig, 'PNG', 20, sigY - 15, 40, 20);
    doc.line(20, sigY, 70, sigY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(treasurerName, 45, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Treasurer / Accountant', 45, sigY + 10, { align: 'center' });

    const managerSig = this.generateSignature(managerName);
    doc.addImage(managerSig, 'PNG', pageWidth - 70, sigY - 15, 40, 20);
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.setFont('helvetica', 'bold');
    doc.text(managerName, pageWidth - 45, sigY + 5, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.text('Estate Manager', pageWidth - 45, sigY + 10, { align: 'center' });

    doc.save(`Receipt_${data.receiptNumber}.pdf`);
  }

  // Same logic applied for Invoice, just tweaked text and reds.
  static async createInvoice(data: any) {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    const stampDataUrl = this.generateDigitalStamp('JENNY SCHOOL ROAD SECURITY RECORD', 'OFFICIAL INVOICE', '#ef4444');
    doc.setGState(new (doc.GState as any)({ opacity: 0.1 }));
    doc.addImage(stampDataUrl, 'PNG', 40, 80, 130, 130);
    doc.setGState(new (doc.GState as any)({ opacity: 1.0 }));

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('JENNY SCHOOL ROAD SECURITY RECORD', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Landlord Association', pageWidth / 2, 27, { align: 'center' });
    
    doc.setLineWidth(0.5);
    doc.line(14, 33, pageWidth - 14, 33);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(239, 68, 68);
    doc.text('OUTSTANDING PAYMENT INVOICE', pageWidth / 2, 43, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date Generated: ${new Date().toLocaleDateString()}`, 14, 55);
    doc.text(`Due Date: IMMEDIATELY`, 14, 61);

    // Landlord
    doc.setDrawColor(239, 68, 68);
    doc.setFillColor(254, 242, 242);
    doc.roundedRect(14, 70, pageWidth - 28, 30, 3, 3, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text(`ATTENTION: ${data.landlordName}`, 18, 78);
    doc.setFont('helvetica', 'normal');
    doc.text(`Compound: ${data.compoundName}`, 18, 85);
    doc.text(`Phone: ${data.phoneNumber || 'N/A'}`, 18, 92);

    // Arrears
    autoTable(doc, {
      startY: 110,
      head: [['Overdue Month', 'Arrears Amount (₦)']],
      body: data.outstandingMonths.map((m: any) => [m.month, m.amount.toLocaleString()]),
      foot: [['TOTAL ARREARS DUE', data.totalOutstanding.toLocaleString()]],
      theme: 'grid',
      headStyles: { fillColor: [239, 68, 68] },
      footStyles: { fillColor: [250, 250, 250], textColor: [239, 68, 68], fontStyle: 'bold' },
      margin: { left: 14, right: 14 }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Bank Details
    doc.setFillColor(240, 245, 255);
    doc.setDrawColor(79, 70, 229);
    doc.rect(14, finalY, pageWidth - 28, 20, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.text('ESTATE PAYMENT ACCOUNT:', 18, finalY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.settings?.bank_account_name || 'Umude Anointing'}  |  ${data.settings?.bank_account_number || '0257831096'}  |  ${data.settings?.bank_name || 'GTBank'}`, 18, finalY + 14);

    // Signatures
    const sigY = finalY + 45;
    const treasurerName = data.settings?.treasurer_name || 'Anointing Umude';
    const managerName = data.settings?.manager_name || 'Mr Macurley';

    const treasurerSig = this.generateSignature(treasurerName);
    doc.addImage(treasurerSig, 'PNG', 20, sigY - 15, 40, 20);
    doc.line(20, sigY, 70, sigY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(treasurerName, 45, sigY + 5, { align: 'center' });
    
    const managerSig = this.generateSignature(managerName);
    doc.addImage(managerSig, 'PNG', pageWidth - 70, sigY - 15, 40, 20);
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.text(managerName, pageWidth - 45, sigY + 5, { align: 'center' });

    doc.save(`Invoice_${data.landlordName.replace(/\s+/g, '_')}.pdf`);
  }

  // Helpers for graphics
  private static generateDigitalStamp(textTop: string, textBottom: string, color = '#4f46e5'): string {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;
    
    ctx.translate(200, 200);
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(0, 0, 180, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(0, 0, 120, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textBottom, 0, 0);

    ctx.font = 'bold 24px Arial';
    ctx.textBaseline = 'bottom';
    
    // Curved text approximation
    const radius = 150;
    const angle = Math.PI;
    ctx.rotate(-angle / 2);
    for (let i = 0; i < textTop.length; i++) {
      ctx.save();
      ctx.rotate(i * (angle / textTop.length));
      ctx.translate(0, -radius);
      ctx.fillText(textTop[i], 0, 0);
      ctx.restore();
    }

    return canvas.toDataURL('image/png');
  }

  private static generateSignature(name: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 80;
    const ctx = canvas.getContext('2d')!;
    
    // Create cursive-like signature
    ctx.font = 'italic 36px "Times New Roman", serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(name, 10, 50);
    
    // Add some realistic noise/lines
    ctx.beginPath();
    ctx.moveTo(10, 55);
    ctx.bezierCurveTo(50, 45, 100, 65, 180, 45);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2;
    ctx.stroke();

    return canvas.toDataURL('image/png');
  }
}
