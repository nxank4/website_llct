"use client";

import { useAuthFetch } from "@/lib/auth";
import { getFullUrl } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/api";
import { RefreshCw, Activity, Database, Server, AlertCircle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect, useCallback } from "react";
import { useLocale } from "@/providers/LocaleProvider";

interface MetricsData {
  enabled: boolean;
  timestamp?: number;
  message?: string;
  error?: string;
  http?: {
    requests_total?: number;
    requests_in_progress?: number;
    errors_total?: number;
    avg_duration_seconds?: number;
    error?: string;
  };
  database?: {
    connections?: {
      write?: {
        active: number;
        idle: number;
        total: number;
      };
      read?: {
        active: number;
        idle: number;
        total: number;
      };
    };
    error?: string;
  };
  application?: {
    uptime_seconds?: number;
    uptime_formatted?: string;
    error?: string;
  };
}

export default function AdminMetricsPage() {
  const authFetch = useAuthFetch();
  const { t } = useLocale();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authFetch(
        getFullUrl(API_ENDPOINTS.ADMIN_METRICS)
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.status}`);
      }
      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      console.error("Error fetching metrics:", err);
      setError(err instanceof Error ? err.message : t("metrics.errorMessage", "Không thể tải metrics"));
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchMetrics();
      }, 5000); // Refresh every 5 seconds
      setRefreshInterval(interval);
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      // Clear interval when autoRefresh is disabled
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      };
    }
  }, [autoRefresh, fetchMetrics, refreshInterval]);

  if (loading && !metrics) {
    return (
      <div className="p-6 md:p-8 bg-background text-foreground min-h-screen flex items-center justify-center">
        <Spinner size="xl" text={t("metrics.loading", "Đang tải metrics...")} />
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card className="border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {t("metrics.error", "Lỗi")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={fetchMetrics} className="mt-4">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t("metrics.tryAgain", "Thử lại")}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!metrics || !metrics.enabled) {
    return (
      <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>{t("metrics.notAvailable", "Metrics không khả dụng")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {metrics?.message || t("metrics.notEnabled", "Prometheus metrics chưa được bật")}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 bg-background text-foreground min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-[hsl(var(--primary))] mb-2 poppins-bold">
                {t("metrics.title", "System Metrics")}
              </h1>
              <p className="text-muted-foreground text-base">
                {t("metrics.subtitle", "Theo dõi hiệu suất và trạng thái hệ thống")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setAutoRefresh(!autoRefresh)}
                variant={autoRefresh ? "default" : "outline"}
                size="default"
              >
                <Activity className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-pulse" : ""}`} />
                {autoRefresh 
                  ? t("metrics.autoRefreshing", "Đang tự động cập nhật")
                  : t("metrics.autoRefresh", "Tự động cập nhật")}
              </Button>
              <Button
                onClick={fetchMetrics}
                disabled={loading}
                variant="default"
                size="default"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                {t("metrics.refresh", "Cập nhật")}
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* HTTP Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                {t("metrics.httpRequests", "HTTP Requests")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.http?.error ? (
                <p className="text-destructive text-sm">{metrics.http.error}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.totalRequests", "Tổng requests")}:</span>
                    <span className="font-semibold">{metrics.http?.requests_total?.toLocaleString() || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.inProgress", "Đang xử lý")}:</span>
                    <span className="font-semibold">{metrics.http?.requests_in_progress || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.errors", "Lỗi")}:</span>
                    <span className={`font-semibold ${(metrics.http?.errors_total || 0) > 0 ? "text-destructive" : ""}`}>
                      {metrics.http?.errors_total?.toLocaleString() || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.avgDuration", "Thời gian TB")}:</span>
                    <span className="font-semibold">
                      {metrics.http?.avg_duration_seconds
                        ? `${(metrics.http.avg_duration_seconds * 1000).toFixed(2)}ms`
                        : "N/A"}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Database Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                {t("metrics.databaseConnections", "Database Connections")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.database?.error ? (
                <p className="text-destructive text-sm">{metrics.database.error}</p>
              ) : (
                <div className="space-y-4">
                  {metrics.database?.connections?.write && (
                    <div>
                      <div className="text-sm font-semibold mb-2">{t("metrics.writePool", "Write Pool")}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.active", "Active")}:</span>
                          <span className="font-semibold">{metrics.database.connections.write.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.idle", "Idle")}:</span>
                          <span className="font-semibold">{metrics.database.connections.write.idle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.total", "Total")}:</span>
                          <span className="font-semibold">{metrics.database.connections.write.total}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {metrics.database?.connections?.read && (
                    <div>
                      <div className="text-sm font-semibold mb-2">{t("metrics.readPool", "Read Pool")}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.active", "Active")}:</span>
                          <span className="font-semibold">{metrics.database.connections.read.active}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.idle", "Idle")}:</span>
                          <span className="font-semibold">{metrics.database.connections.read.idle}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t("metrics.total", "Total")}:</span>
                          <span className="font-semibold">{metrics.database.connections.read.total}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {!metrics.database?.connections?.write && !metrics.database?.connections?.read && (
                    <p className="text-muted-foreground text-sm">{t("metrics.noData", "Không có dữ liệu")}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Application Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t("metrics.application", "Application")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {metrics.application?.error ? (
                <p className="text-destructive text-sm">{metrics.application.error}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.uptime", "Uptime")}:</span>
                    <span className="font-semibold">
                      {metrics.application?.uptime_formatted || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t("metrics.seconds", "Giây")}:</span>
                    <span className="font-semibold">
                      {metrics.application?.uptime_seconds?.toLocaleString() || 0}
                    </span>
                  </div>
                  {metrics.timestamp && (
                    <div className="flex justify-between text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
                      <span>{t("metrics.lastUpdated", "Cập nhật")}:</span>
                      <span>{new Date(metrics.timestamp * 1000).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

