"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Calendar, Clock, User, Phone, Mail, MapPin, CheckCircle } from "lucide-react";
import Image from "next/image";

interface ConfirmedVisit {
  id: string;
  visitDate: string;
  visitTime: string;
  property: {
    id: string;
    title: string;
    street: string;
    city: string;
    state: string;
  };
  realtor: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  contact: {
    name: string;
    email: string;
    phone: string | null;
  } | null;
}

export default function OwnerConfirmedVisitsPage() {
  const { data: session } = useSession();
  const [visits, setVisits] = useState<ConfirmedVisit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user) {
      fetchConfirmedVisits();
    }
  }, [session]);

  const fetchConfirmedVisits = async () => {
    try {
      const response = await fetch(`/api/owner/leads/confirmed`);
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
      console.error("Error fetching confirmed visits:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const groupByDate = (visits: ConfirmedVisit[]) => {
    const grouped: Record<string, ConfirmedVisit[]> = {};
    
    visits.forEach((visit) => {
      const dateKey = new Date(visit.visitDate).toISOString().split("T")[0];
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(visit);
    });

    // Ordenar por horário dentro de cada dia
    Object.keys(grouped).forEach((key) => {
      grouped[key].sort((a, b) => {
        return a.visitTime.localeCompare(b.visitTime);
      });
    });

    return grouped;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Carregando visitas...</p>
        </div>
      </div>
    );
  }

  const groupedVisits = groupByDate(visits);
  const dates = Object.keys(groupedVisits).sort();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Visitas Confirmadas
              </h1>
              <p className="text-gray-600 mt-1">
                Suas próximas visitas agendadas
              </p>
            </div>
            {visits.length > 0 && (
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-medium flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                {visits.length} visita{visits.length !== 1 ? "s" : ""}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {visits.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma visita agendada
            </h3>
            <p className="text-gray-600">
              Quando você aprovar visitas, elas aparecerão aqui
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map((dateKey) => {
              const dateVisits = groupedVisits[dateKey];
              const date = new Date(dateKey + "T00:00:00");

              return (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="glass-teal text-white px-6 py-3 rounded-t-xl">
                    <h2 className="text-xl font-bold capitalize flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      {formatDate(date.toISOString())}
                    </h2>
                  </div>

                  {/* Visits for this date */}
                  <div className="bg-white rounded-b-xl border-2 border-blue-600 border-t-0 divide-y">
                    {dateVisits.map((visit) => (
                      <div key={visit.id} className="p-6 hover:bg-gray-50 transition-colors">
                        <div className="flex gap-6">
                          {/* Time */}
                          <div className="flex-shrink-0 text-center">
                            <div className="bg-blue-100 rounded-lg p-4">
                              <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                              <p className="text-2xl font-bold text-blue-900">
                                {visit.visitTime}
                              </p>
                            </div>
                          </div>

                          {/* Details */}
                          <div className="flex-1">
                            {/* Property */}
                            <div className="mb-4">
                              <h3 className="text-lg font-bold text-gray-900">
                                {visit.property.title}
                              </h3>
                              <div className="flex items-center gap-2 text-gray-600 mt-1">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">
                                  {visit.property.street}, {visit.property.city} - {visit.property.state}
                                </span>
                              </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              {/* Realtor */}
                              {visit.realtor && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Corretor
                                  </h4>
                                  <p className="font-medium text-gray-900">
                                    {visit.realtor.name || "N/A"}
                                  </p>
                                  {visit.realtor.email && (
                                    <a
                                      href={`mailto:${visit.realtor.email}`}
                                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                                    >
                                      <Mail className="w-3 h-3" />
                                      {visit.realtor.email}
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Client */}
                              {visit.contact && (
                                <div className="bg-blue-50 rounded-lg p-4">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    Cliente
                                  </h4>
                                  <p className="font-medium text-gray-900">
                                    {visit.contact.name}
                                  </p>
                                  {visit.contact.phone && (
                                    <a
                                      href={`tel:${visit.contact.phone}`}
                                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                                    >
                                      <Phone className="w-3 h-3" />
                                      {visit.contact.phone}
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
