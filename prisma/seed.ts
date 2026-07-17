import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.contratoItem.deleteMany();
  await prisma.contrato.deleteMany();
  await prisma.produto.deleteMany();

  const processadora = await prisma.produto.create({
    data: {
      categoria: "Processadora",
      item: "Processadora Novastar VX400",
      lote: "NV-2025-01",
      descricao: "Processadora de vídeo all-in-one Novastar VX400, capacidade 2.6MP",
      qtdTotal: 8,
      qtdManutencao: 1,
      valorCusto: 4800,
      valorRevenda: 7500,
    },
  });

  const modulo = await prisma.produto.create({
    data: {
      categoria: "Módulo",
      item: "Módulo LED P2.5 Indoor",
      lote: "P25-B032",
      descricao: "Módulo P2.5 SMD2121 320x160mm, resolução 128x64px, indoor",
      qtdTotal: 500,
      qtdManutencao: 20,
      valorCusto: 185.5,
      valorRevenda: 320,
    },
  });

  const fonte = await prisma.produto.create({
    data: {
      categoria: "Fonte",
      item: "Fonte Chaveada 5V 60A",
      lote: "FT60-2201",
      descricao: "Fonte 5V 60A 300W bivolt para painéis de LED",
      qtdTotal: 80,
      qtdManutencao: 4,
      valorCusto: 98,
      valorRevenda: 175,
    },
  });

  const itensContrato = [
    { produtoId: modulo.id, quantidade: 100 },
    { produtoId: fonte.id, quantidade: 12 },
    { produtoId: processadora.id, quantidade: 1 },
  ];

  const contrato = await prisma.contrato.create({
    data: {
      anoProv: "2026/001",
      status: "PROVISIONADO",
      cliente: "Show Eventos Ltda",
      tamanhoPainel: "4,00m x 2,00m (P2.5)",
      prazo: new Date("2026-08-15T00:00:00.000Z"),
      observacoes: "Palco principal. Entrega e montagem inclusas no contrato.",
      itens: { create: itensContrato },
    },
  });

  for (const item of itensContrato) {
    await prisma.produto.update({
      where: { id: item.produtoId },
      data: { qtdProvisionado: { increment: item.quantidade } },
    });
  }

  const produtos = await prisma.produto.findMany({ orderBy: { id: "asc" } });
  console.log(`Contrato ${contrato.anoProv} (${contrato.status}) criado para ${contrato.cliente}.`);
  for (const p of produtos) {
    const disp = p.qtdTotal - p.qtdManutencao - p.qtdProvisionado;
    console.log(
      `${p.item}: total=${p.qtdTotal} manutencao=${p.qtdManutencao} provisionado=${p.qtdProvisionado} disponivel=${disp}`
    );
  }
  console.log("Seed concluído com sucesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
