"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, Building2, CheckCircle2, Clock3, Globe, MapPin, MessageCircle, PhoneCall, ShieldCheck, Users } from "lucide-react";
import AgencyLeadCaptureDrawer from "@/components/realtor/AgencyLeadCaptureDrawer";

type AgencyPublicProfileSectionsProps = {
  agencySlug: string | null;
  agencyName: string;
  website: string | null;
  specialties: string[];
  yearsInBusiness: number | null;
  serviceAreas: string[];
  completion: {
    score: number;
    checklist: Array<{ key: string; label: string; done: boolean }>;
  } | null;
  teamMembers: Array<{
    id: string;
    name: string;
    image: string | null;
    headline: string | null;
    publicSlug: string | null;
    whatsappHref: string | null;
  }>;
  ctaCards: Array<{
    key: string;
    intent: "BUY" | "RENT" | "LIST";
    title: string;
    description: string;
    actionLabel: string;
    href: string | null;
    contactName: string | null;
    helper: string | null;
  }>;
  operationMetrics: Array<{
    label: string;
    value: string;
    helper: string;
  }>;
};

function normalizeUrl(value: string | null) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function compactUrl(value: string | null) {
  const normalized = normalizeUrl(value);
  if (!normalized) return null;
  return normalized.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export default function AgencyPublicProfileSections({
  agencySlug,
  agencyName,
  website,
  specialties,
  yearsInBusiness,
  serviceAreas,
  completion,
  teamMembers,
  ctaCards,
  operationMetrics,
}: AgencyPublicProfileSectionsProps) {
  const visibleChecklist = completion?.checklist?.slice(0, 6) || [];
  const [selectedCtaKey, setSelectedCtaKey] = useState<string | null>(null);
  const selectedCta = ctaCards.find((card) => card.key === selectedCtaKey) || null;
  const websiteHref = normalizeUrl(website);

  return (
    <>
      <div className="space-y-12 border-b border-slate-200 py-10">
        {ctaCards.length > 0 ? (
          <section>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Rotas de atendimento</div>
                <h2 className="mt-2 font-serif text-3xl text-slate-950">Entradas comerciais da agência</h2>
              </div>
              <div className="text-sm text-slate-600">Mantivemos todos os fluxos já existentes em uma apresentação mais institucional.</div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              {ctaCards.map((card) => {
                const isReady = Boolean(agencySlug);
                return (
                  <div key={card.key} className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{card.intent}</div>
                        <h3 className="mt-2 text-xl font-semibold text-slate-950">{card.title}</h3>
                      </div>
                      <div className="rounded-full border border-slate-200 bg-slate-50 p-3 text-slate-800">
                        {card.key === "list" ? <Building2 className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-7 text-slate-600">{card.description}</p>
                    <div className="mt-4 text-sm text-slate-600">{card.contactName ? `Responsável: ${card.contactName}` : card.helper || "Canal em configuração"}</div>

                    {isReady ? (
                      <div className="mt-6 space-y-3">
                        <button
                          type="button"
                          onClick={() => setSelectedCtaKey(card.key)}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <MessageCircle className="h-4 w-4" />
                          {card.actionLabel}
                        </button>
                        {card.href ? (
                          <a
                            href={card.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                          >
                            <PhoneCall className="h-4 w-4" />
                            Falar no WhatsApp
                          </a>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-semibold text-slate-500">
                        <ShieldCheck className="h-4 w-4" />
                        Em configuração
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_360px]">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Institucional</div>
            <h2 className="mt-2 font-serif text-3xl text-slate-950">Estrutura comercial e posicionamento da agência</h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap gap-2">
                  {yearsInBusiness != null && yearsInBusiness > 0 ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                      <Clock3 className="h-4 w-4" />
                      {yearsInBusiness} ano{yearsInBusiness === 1 ? "" : "s"} de mercado
                    </span>
                  ) : null}
                  {websiteHref ? (
                    <a
                      href={websiteHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      <Globe className="h-4 w-4" />
                      {compactUrl(websiteHref)}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>

                <div className="mt-6">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                    <Building2 className="h-4 w-4" />
                    Especialidades
                  </div>
                  {specialties.length > 0 ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {specialties.map((item) => (
                        <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 text-sm leading-7 text-slate-500">A agência ainda não publicou especialidades institucionais.</div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                  <MapPin className="h-4 w-4" />
                  Regiões atendidas
                </div>
                {serviceAreas.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {serviceAreas.slice(0, 14).map((item) => (
                      <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 text-sm leading-7 text-slate-500">A atuação regional será detalhada em breve.</div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Operação</div>
              <h3 className="mt-2 font-serif text-2xl text-slate-950">Atendimento e capacidade</h3>

              <div className="mt-5 space-y-3">
                {operationMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-[22px] border border-slate-200 bg-slate-50 px-4 py-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">{metric.label}</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-950">{metric.value}</div>
                    <div className="mt-1 text-sm text-slate-600">{metric.helper}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Completude</div>
              <h3 className="mt-2 font-serif text-2xl text-slate-950">Prontidão do perfil</h3>

              {completion ? (
                <>
                  <div className="mt-5 rounded-[24px] bg-slate-950 px-5 py-6 text-white">
                    <div className="text-sm text-white/70">Perfil institucional</div>
                    <div className="mt-2 text-4xl font-semibold">{completion.score}%</div>
                    <div className="mt-2 text-sm leading-6 text-white/70">Campos estratégicos publicados para dar confiança e contexto ao visitante.</div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {visibleChecklist.map((item) => (
                      <div key={item.key} className="flex items-center justify-between gap-3 rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="text-sm text-slate-700">{item.label}</div>
                        <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {item.done ? "Ok" : "Pendente"}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="mt-5 text-sm leading-7 text-slate-500">A prontidão do perfil estará disponível após a publicação institucional.</div>
              )}
            </div>
          </div>
        </section>

        <section id="team" className="scroll-mt-28">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">Equipe</div>
              <h2 className="mt-2 font-serif text-3xl text-slate-950">Profissionais em destaque</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
              <Users className="h-4 w-4" />
              {teamMembers.length} perfil{teamMembers.length === 1 ? "" : "s"}
            </span>
          </div>

          {teamMembers.length > 0 ? (
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teamMembers.map((member) => {
                const profileHref = member.publicSlug ? `/realtor/${member.publicSlug}` : null;
                return (
                  <div key={member.id} className="rounded-[28px] border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm">
                    <div className="flex items-start gap-4">
                      <div className="relative h-16 w-16 overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
                        {member.image ? (
                          <Image src={member.image} alt={member.name} fill className="object-cover" sizes="64px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold text-slate-950">{member.name}</div>
                        <div className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{member.headline || "Especialista do time"}</div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {member.whatsappHref ? (
                        <a
                          href={member.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : null}
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                        >
                          Perfil
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-8 text-sm text-slate-500">
              O time público ainda está sendo organizado.
            </div>
          )}
        </section>
      </div>

      <AgencyLeadCaptureDrawer
        open={Boolean(selectedCta)}
        onClose={() => setSelectedCtaKey(null)}
        agencySlug={agencySlug}
        agencyName={agencyName}
        intent={selectedCta?.intent || null}
        whatsappHref={selectedCta?.href || null}
      />
    </>
  );
}
