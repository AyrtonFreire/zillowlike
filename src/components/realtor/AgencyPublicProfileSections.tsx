"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Building2, CheckCircle2, Clock3, Globe, MapPin, MessageCircle, PhoneCall, ShieldCheck, Users } from "lucide-react";
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

  return (
    <>
      <div className="mt-8 space-y-8 px-4 sm:px-6 lg:px-10">
      {ctaCards.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-3">
          {ctaCards.map((card) => {
            const isReady = Boolean(agencySlug);
            return (
              <div key={card.key} className="rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">CTA</div>
                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-950">{card.title}</h2>
                  </div>
                  <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-teal-700">
                    {card.key === "list" ? <Building2 className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-neutral-600">{card.description}</p>
                <div className="mt-4 text-xs text-neutral-500">
                  {card.contactName ? `Responsável: ${card.contactName}` : card.helper || "Canal em configuração"}
                </div>
                {isReady ? (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedCtaKey(card.key)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-700 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-800"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {card.actionLabel}
                    </button>
                    {card.href ? (
                      <a
                        href={card.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-700 transition-colors hover:bg-neutral-50"
                      >
                        <PhoneCall className="h-4 w-4" />
                        Falar no WhatsApp
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-500">
                    <ShieldCheck className="h-4 w-4" />
                    Em configuração
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Institucional</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">Estrutura comercial da agência</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {yearsInBusiness != null && yearsInBusiness > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700">
                  <Clock3 className="h-4 w-4 text-teal-700" />
                  {yearsInBusiness} ano{yearsInBusiness === 1 ? "" : "s"} de mercado
                </span>
              ) : null}
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-white"
                >
                  <Globe className="h-4 w-4 text-teal-700" />
                  Site institucional
                </a>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <Building2 className="h-4 w-4 text-teal-700" />
                Especialidades
              </div>
              {specialties.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {specialties.map((item) => (
                    <span key={item} className="rounded-full border border-teal-100 bg-white px-3 py-1.5 text-xs font-semibold text-teal-800">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-neutral-500">A agência ainda não publicou especialidades institucionais.</div>
              )}
            </div>

            <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
                <MapPin className="h-4 w-4 text-teal-700" />
                Regiões atendidas
              </div>
              {serviceAreas.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {serviceAreas.slice(0, 12).map((item) => (
                    <span key={item} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">
                      {item}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="mt-4 text-sm text-neutral-500">A atuação regional será detalhada em breve.</div>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Operação</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">Atendimento e capacidade</h2>
          <div className="mt-5 grid gap-3">
            {operationMetrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-neutral-500">{metric.label}</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-950">{metric.value}</div>
                <div className="mt-1 text-sm text-neutral-600">{metric.helper}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Time</div>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">Profissionais em destaque</h2>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-semibold text-neutral-700">
              <Users className="h-4 w-4 text-teal-700" />
              {teamMembers.length} perfil{teamMembers.length === 1 ? "" : "s"}
            </span>
          </div>

          {teamMembers.length > 0 ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {teamMembers.map((member) => {
                const profileHref = member.publicSlug ? `/realtor/${member.publicSlug}` : null;
                const cardContent = (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="relative h-14 w-14 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                        {member.image ? (
                          <Image src={member.image} alt={member.name} fill className="object-cover" sizes="56px" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-sm font-semibold text-neutral-600">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-neutral-950">{member.name}</div>
                        <div className="mt-1 line-clamp-2 text-sm text-neutral-600">{member.headline || "Especialista do time"}</div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      {member.whatsappHref ? (
                        <a
                          href={member.whatsappHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-green-600 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
                        >
                          <MessageCircle className="h-4 w-4" />
                          WhatsApp
                        </a>
                      ) : null}
                      {profileHref ? (
                        <Link
                          href={profileHref}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white px-3 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
                        >
                          <PhoneCall className="h-4 w-4" />
                          Perfil
                        </Link>
                      ) : null}
                    </div>
                  </>
                );
                return (
                  <div
                    key={member.id}
                    className="rounded-3xl border border-neutral-200 bg-neutral-50/70 p-4 transition-colors hover:bg-white"
                  >
                    {cardContent}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 p-5 text-sm text-neutral-500">
              O time público ainda está sendo organizado.
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">Completude</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">Prontidão do perfil</h2>
          {completion ? (
            <>
              <div className="mt-4 rounded-3xl bg-gradient-to-br from-teal-700 via-teal-700 to-emerald-600 px-5 py-6 text-white">
                <div className="text-sm font-medium text-white/80">Perfil institucional</div>
                <div className="mt-2 text-4xl font-semibold">{completion.score}%</div>
                <div className="mt-1 text-sm text-white/80">Campos estratégicos publicados para conversão.</div>
              </div>
              <div className="mt-4 space-y-2">
                {visibleChecklist.map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                    <div className="text-sm text-neutral-700">{item.label}</div>
                    <div className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${item.done ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {item.done ? "Ok" : "Pendente"}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="mt-5 text-sm text-neutral-500">A prontidão do perfil estará disponível após a publicação institucional.</div>
          )}
        </div>
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
