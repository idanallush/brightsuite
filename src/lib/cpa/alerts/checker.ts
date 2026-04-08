import type { ClientCardData, TopicMetrics } from "@/types/cpa-dashboard";
import type { AlertConfig } from "@/types/cpa-client";

export interface AlertViolation {
  client_id: string;
  client_name: string;
  topic_id: string;
  topic_name: string;
  actual_cpa: number;
  target_cpa: number;
  overshoot_percent: number;
  currency: string;
  date_range: { since: string; until: string };
}

export function checkAlerts(
  cards: ClientCardData[],
  configs: AlertConfig[],
  dateRange: { since: string; until: string }
): AlertViolation[] {
  const violations: AlertViolation[] = [];

  for (const card of cards) {
    const clientConfigs = configs.filter(
      (c) => c.client_id === card.client_id && c.is_enabled
    );

    for (const topic of card.topics) {
      if (topic.cpa === null || topic.tcpa === null || topic.tcpa <= 0) continue;

      const overshootPercent = ((topic.cpa - topic.tcpa) / topic.tcpa) * 100;
      if (overshootPercent <= 0) continue;

      const relevantConfig = clientConfigs.find(
        (c) => c.topic_id === topic.topic_id || c.topic_id === null
      );
      if (!relevantConfig) continue;

      if (overshootPercent >= relevantConfig.threshold_percent) {
        violations.push({
          client_id: card.client_id,
          client_name: card.client_name,
          topic_id: topic.topic_id,
          topic_name: topic.topic_name,
          actual_cpa: topic.cpa,
          target_cpa: topic.tcpa,
          overshoot_percent: Math.round(overshootPercent * 100) / 100,
          currency: card.currency,
          date_range: dateRange,
        });
      }
    }
  }

  return violations;
}
