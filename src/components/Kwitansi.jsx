import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { Printer } from 'lucide-react'

const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']

export function cetakKwitansi(pembayaran, pelanggan) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })

  const pageW = doc.internal.pageSize.getWidth()

  // ── Header ──
  doc.setFillColor(30, 64, 175)
  doc.rect(0, 0, pageW, 30, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text('Bursa it Hotspot', pageW / 2, 13, { align: 'center' })

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('Bukti Pembayaran Layanan Internet', pageW / 2, 21, { align: 'center' })

  // ── No Kwitansi & Tanggal ──
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.text(`No: ${pembayaran.kwitansi_no || '-'}`, 14, 38)
  doc.setFont('helvetica', 'normal')
  doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageW - 14, 38, { align: 'right' })

  // ── Garis ──
  doc.setDrawColor(220, 220, 220)
  doc.line(14, 41, pageW - 14, 41)

  // ── Info Pelanggan ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('Data Pelanggan', 14, 49)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  const infoPelanggan = [
    ['Nama', pelanggan.nama],
    ['Alamat', pelanggan.alamat || '-'],
    ['No HP', pelanggan.no_hp || '-'],
    ['Paket', pelanggan.paket],
  ]
  infoPelanggan.forEach(([label, value], i) => {
    const y = 56 + (i * 7)
    doc.setTextColor(120)
    doc.text(label, 14, y)
    doc.setTextColor(0)
    doc.text(`: ${value}`, 45, y)
  })

  // ── Garis ──
  doc.line(14, 87, pageW - 14, 87)

  // ── Detail Pembayaran ──
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text('Detail Pembayaran', 14, 95)

  autoTable(doc, {
    startY: 99,
    margin: { left: 14, right: 14 },
    head: [['Keterangan', 'Detail']],
    body: [
      ['Periode', `${BULAN[pembayaran.bulan - 1]} ${pembayaran.tahun}`],
      ['Paket', pelanggan.paket],
      ['Metode Bayar', pembayaran.metode_bayar || '-'],
      ['Tanggal Bayar', pembayaran.tanggal_bayar || '-'],
      ['Status', pembayaran.status.replace('_', ' ').toUpperCase()],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 50, fontStyle: 'bold', textColor: [80, 80, 80] } },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  })

  const finalY = doc.lastAutoTable.finalY + 8

  // ── Total ──
  doc.setFillColor(30, 64, 175)
  doc.roundedRect(14, finalY, pageW - 28, 16, 3, 3, 'F')
  doc.setTextColor(255)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL PEMBAYARAN', 20, finalY + 7)
  doc.setFontSize(12)
  doc.text(`Rp ${Number(pembayaran.jumlah).toLocaleString('id-ID')}`, pageW - 18, finalY + 10, { align: 'right' })

  // ── Footer ──
  const footerY = finalY + 30
  doc.setTextColor(120)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text('Terima kasih telah membayar tepat waktu!', pageW / 2, footerY, { align: 'center' })
  doc.text('Kwitansi ini merupakan bukti pembayaran yang sah.', pageW / 2, footerY + 6, { align: 'center' })

  // ── Tanda Tangan ──
  doc.setTextColor(0)
  doc.text('Admin,', pageW - 45, footerY + 18)
  doc.line(pageW - 55, footerY + 32, pageW - 14, footerY + 32)
  doc.text('(................................)', pageW - 55, footerY + 38)

  doc.save(`Kwitansi_${pembayaran.kwitansi_no || 'pembayaran'}.pdf`)
}

export default function TombolKwitansi({ pembayaran, pelanggan }) {
  if (pembayaran.status !== 'lunas') return null

  return (
    <button
      onClick={() => cetakKwitansi(pembayaran, pelanggan)}
      className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-700 transition-colors"
      title="Cetak Kwitansi"
    >
      <Printer size={13} /> Kwitansi
    </button>
  )
}