import crypto from 'node:crypto';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../lib/httpError.js';

type ContractWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.rentalContract.findUnique>>
> & {
  booking: {
    bookingCode: string;
    rentalDays: number;
    dailyRateSnapshot: unknown;
    rentalSubtotal: unknown;
    depositAmount: unknown;
    totalEstimatedCost: unknown;
    currency: string;
    pickupDate: Date;
    customer: { user: { fullName: string; email: string } };
    vehicle: {
      brand: string;
      model: string;
      licensePlate: string;
      category: { name: string };
      branch: { name: string };
    };
  };
  contractNumber: string;
  expectedReturnDate: Date;
  actualPickupAt: Date;
  inspections?: Array<{
    inspectionType: string;
    mileage: number;
    fuelLevelPercent: number;
    condition: string;
  }>;
  invoice?: {
    rentalFee: unknown;
    insuranceFee: unknown;
    fineFee: unknown;
    discountAmount: unknown;
    totalAmount: unknown;
    depositApplied: unknown;
    finalAmountDue: unknown;
    amountPaid: unknown;
    refundAmount: unknown;
    status: string;
  } | null;
};

function buildPdfBuffer(builder: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    builder(doc);
    doc.end();
  });
}

export async function generateAndStoreDocument(
  contractId: string,
  documentType: 'RENTAL_CONTRACT' | 'RECEIPT' | 'OTHER',
  generatedById: string | null,
) {
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId },
    include: {
      booking: {
        include: {
          customer: { include: { user: { select: { fullName: true, email: true } } } },
          vehicle: { include: { category: true, branch: true } },
        },
      },
      inspections: true,
      invoice: { include: { lines: true } },
    },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');

  let buffer: Buffer;
  if (documentType === 'RENTAL_CONTRACT') {
    buffer = await buildContractPdf(contract);
  } else {
    buffer = await buildReceiptPdf(contract);
  }

  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const version =
    (await prisma.contractDocument.count({ where: { contractId, documentType } })) + 1;

  // Mark previous current as not current.
  await prisma.contractDocument.updateMany({
    where: { contractId, documentType, isCurrent: true },
    data: { isCurrent: false },
  });

  const storageKey = `${documentType.toLowerCase()}/${contractId}/v${version}.pdf`;

  const doc = await prisma.contractDocument.create({
    data: {
      contractId,
      documentType,
      version,
      storageKey,
      mimeType: 'application/pdf',
      sizeBytes: BigInt(buffer.length),
      sha256,
      generatedById,
      isCurrent: true,
    },
  });

  return { document: doc, buffer };
}

export async function buildContractPdf(
  contract: Awaited<ReturnType<typeof prisma.rentalContract.findUnique>> & object,
): Promise<Buffer> {
  return buildPdfBuffer((doc) => {
    const c = contract as ContractWithRelations;
    doc.fontSize(18).text('VEHICLE RENTAL CONTRACT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Contract number: ${c.contractNumber}`);
    doc.text(`Booking code: ${c.booking.bookingCode}`);
    doc.text(`Customer: ${c.booking.customer.user.fullName} (${c.booking.customer.user.email})`);
    doc.text(
      `Vehicle: ${c.booking.vehicle.brand} ${c.booking.vehicle.model} - ${c.booking.vehicle.licensePlate}`,
    );
    doc.text(`Category: ${c.booking.vehicle.category.name}`);
    doc.text(`Branch: ${c.booking.vehicle.branch.name}`);
    doc.text(`Pickup date: ${new Date(c.booking.pickupDate).toISOString().slice(0, 10)}`);
    doc.text(`Expected return date: ${new Date(c.expectedReturnDate).toISOString().slice(0, 10)}`);
    doc.text(`Rental days: ${c.booking.rentalDays}`);
    doc.text(`Daily rate: ${c.booking.dailyRateSnapshot}`);
    doc.text(`Rental subtotal: ${c.booking.rentalSubtotal}`);
    doc.text(`Deposit: ${c.booking.depositAmount}`);
    doc.text(`Total estimated: ${c.booking.totalEstimatedCost}`);
    doc.moveDown();
    doc.text(`Actual pickup: ${new Date(c.actualPickupAt).toISOString()}`);
    const pickupInspection = c.inspections?.find(
      (i: { inspectionType: string }) => i.inspectionType === 'PICKUP',
    );
    if (pickupInspection) {
      doc.text(`Pickup mileage: ${pickupInspection.mileage}`);
      doc.text(`Pickup fuel: ${pickupInspection.fuelLevelPercent}%`);
      doc.text(`Pickup condition: ${pickupInspection.condition}`);
    }
    doc.moveDown();
    doc.font('Helvetica-Oblique').text('This contract is generated by the Vehicle Rental System.');
  });
}

export async function buildReceiptPdf(
  contract: Awaited<ReturnType<typeof prisma.rentalContract.findUnique>> & object,
): Promise<Buffer> {
  return buildPdfBuffer((doc) => {
    const c = contract as ContractWithRelations;
    const inv = c.invoice;
    doc.fontSize(18).text('RENTAL RECEIPT', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11);
    doc.text(`Contract number: ${c.contractNumber}`);
    doc.text(`Booking code: ${c.booking.bookingCode}`);
    doc.text(`Customer: ${c.booking.customer.user.fullName}`);
    doc.text(
      `Vehicle: ${c.booking.vehicle.brand} ${c.booking.vehicle.model} - ${c.booking.vehicle.licensePlate}`,
    );
    doc.moveDown();
    if (inv) {
      doc.text(`Rental fee: ${inv.rentalFee}`);
      doc.text(`Insurance fee: ${inv.insuranceFee}`);
      doc.text(`Fine fee: ${inv.fineFee}`);
      doc.text(`Discount: ${inv.discountAmount}`);
      doc.text(`Total: ${inv.totalAmount}`);
      doc.text(`Deposit applied: ${inv.depositApplied}`);
      doc.text(`Final amount due: ${inv.finalAmountDue}`);
      doc.text(`Amount paid: ${inv.amountPaid}`);
      doc.text(`Refund: ${inv.refundAmount}`);
      doc.text(`Status: ${inv.status}`);
    }
    doc.moveDown();
    doc.font('Helvetica-Oblique').text('Thank you for using VRS.');
  });
}

export async function getDocumentBuffer(
  contractId: string,
  documentId: string,
  requesterId: string,
  requesterRole: 'CUSTOMER' | 'STAFF' | 'ADMIN',
): Promise<{ buffer: Buffer; document: unknown }> {
  const document = await prisma.contractDocument.findUnique({ where: { documentId } });
  if (!document || document.contractId !== contractId) {
    throw new HttpError(404, 'Document not found', 'DOCUMENT_NOT_FOUND');
  }
  const contract = await prisma.rentalContract.findUnique({
    where: { contractId },
    include: {
      booking: {
        include: {
          customer: { include: { user: { select: { fullName: true, email: true } } } },
          vehicle: { include: { category: true, branch: true } },
        },
      },
      inspections: true,
      invoice: { include: { lines: true } },
      documents: true,
    },
  });
  if (!contract) throw new HttpError(404, 'Contract not found', 'CONTRACT_NOT_FOUND');
  if (requesterRole === 'CUSTOMER' && contract.booking.customerId !== requesterId) {
    throw new HttpError(403, 'Forbidden', 'FORBIDDEN');
  }

  let buffer: Buffer;
  if (document.documentType === 'RENTAL_CONTRACT') {
    buffer = await buildContractPdf(contract);
  } else {
    buffer = await buildReceiptPdf(contract);
  }
  return { buffer, document };
}
