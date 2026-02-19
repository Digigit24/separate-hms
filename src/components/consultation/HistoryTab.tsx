// src/components/consultation/HistoryTab.tsx
import React, { useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { opdVisitService } from '@/services/opdVisit.service';
import { opdTemplateService } from '@/services/opdTemplate.service';
import { OpdVisit } from '@/types/opdVisit.types';
import { TemplateResponse } from '@/types/opdTemplate.types';
import { format } from 'date-fns';

interface HistoryTabProps {
  patientId: number;
}

interface VisitWithResponses extends OpdVisit {
  templateResponses?: TemplateResponse[];
  loadingResponses?: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ patientId }) => {
  const [expandedVisits, setExpandedVisits] = useState<Set<number>>(new Set());

  // Fetch patient visits
  const { data: visitsData, isLoading: loadingVisits } = useSWR(
    patientId ? ['patient-visits', patientId] : null,
    () => opdVisitService.getOpdVisits({
      patient_id: patientId,
      page_size: 50,
      ordering: '-visit_date,-visit_time'
    })
  );

  // Fetch template responses for all visits
  const { data: allTemplateResponses, isLoading: loadingResponses } = useSWR(
    visitsData?.results ? ['all-template-responses'] : null,
    async () => {
      if (!visitsData?.results) return [];
      const responses = await opdTemplateService.getTemplateResponses({
        page_size: 200,
        ordering: '-created_at'
      });
      return responses.results;
    }
  );

  const visitHistory: VisitWithResponses[] = visitsData?.results || [];

  // Group template responses by visit
  const responsesByVisit = React.useMemo(() => {
    const map = new Map<number, TemplateResponse[]>();
    if (allTemplateResponses) {
      allTemplateResponses.forEach(response => {
        const existing = map.get(response.visit) || [];
        existing.push(response);
        map.set(response.visit, existing);
      });
    }
    return map;
  }, [allTemplateResponses]);

  const toggleVisit = (visitId: number) => {
    const newExpanded = new Set(expandedVisits);
    if (newExpanded.has(visitId)) {
      newExpanded.delete(visitId);
    } else {
      newExpanded.add(visitId);
    }
    setExpandedVisits(newExpanded);
  };

  const formatDate = (dateString: string | null | undefined, formatString: string = 'dd MMM yyyy'): string => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return format(date, formatString);
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-2">
      {/* Stats strip */}
      <div className="flex items-center gap-4 text-[11px] border-b pb-2">
        <div>
          <span className="text-muted-foreground">Total Visits: </span>
          <span className="font-semibold">
            {loadingVisits ? '...' : visitsData?.count || 0}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Last Visit: </span>
          <span className="font-semibold">
            {loadingVisits ? '...' : visitHistory[0] ? formatDate(visitHistory[0].visit_date) : 'N/A'}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Records: </span>
          <span className="font-semibold">
            {loadingResponses ? '...' : allTemplateResponses?.length || 0}
          </span>
        </div>
      </div>

      {/* Visit list */}
      {loadingVisits ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : visitHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          No previous visits found
        </p>
      ) : (
        <div className="space-y-0">
          {visitHistory.map((visit) => {
            const visitResponses = responsesByVisit.get(visit.id) || [];
            const isExpanded = expandedVisits.has(visit.id);

            return (
              <div key={visit.id} className="border-b last:border-b-0 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{visit.visit_number}</span>
                      {visitResponses.length > 0 && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                          {visitResponses.length} {visitResponses.length === 1 ? 'record' : 'records'}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(visit.visit_date)} {visit.doctor_details?.full_name ? `· ${visit.doctor_details.full_name}` : ''}
                    </p>
                    {visit.chief_complaint && (
                      <p className="text-xs mt-1">
                        <span className="text-muted-foreground">CC: </span>{visit.chief_complaint}
                      </p>
                    )}
                    {visit.diagnosis && (
                      <p className="text-xs mt-0.5">
                        <span className="text-muted-foreground">Dx: </span>{visit.diagnosis}
                      </p>
                    )}
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase font-normal shrink-0"
                  >
                    {visit.status}
                  </Badge>
                </div>

                {/* Template responses */}
                {visitResponses.length > 0 && (
                  <div className="mt-2">
                    <button
                      onClick={() => toggleVisit(visit.id)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {isExpanded ? 'Hide' : 'View'} records ({visitResponses.length})
                    </button>

                    {isExpanded && (
                      <div className="mt-2 space-y-1.5 pl-3 border-l">
                        {visitResponses.map((response) => (
                          <div key={response.id} className="py-1.5 px-2.5 bg-muted/40 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">
                                {response.template_name || `Template #${response.template}`}
                              </span>
                              <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
                                {response.status}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {formatDate(response.created_at, 'dd MMM yyyy HH:mm')}
                              {response.filled_by_name && ` · ${response.filled_by_name}`}
                              {response.field_responses && response.field_responses.length > 0 && ` · ${response.field_responses.length} fields`}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
