/**
 * Shared hook for fetching and caching student results with simple in-memory caching.
 */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthFetch } from "@/lib/auth";
import { API_ENDPOINTS, getFullUrl } from "@/lib/api";

export interface StudentTestResult {
    id: string;
    assessment_id: string;
    assessment_title: string;
    subject_code?: string;
    subject_name?: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    time_taken: number;
    attempt_number: number;
    completed_at: string;
    grade?: string;
}

interface CacheEntry {
    data: StudentTestResult[];
    loading: boolean;
    error: string | null;
    subscribers: Set<() => void>;
    promise?: Promise<void>;
    lastFetchedAt?: number;
}

interface HookState {
    results: StudentTestResult[];
    loading: boolean;
    error: string | null;
}

const cache = new Map<string, CacheEntry>();

function getOrCreateEntry(userId: string): CacheEntry {
    let entry = cache.get(userId);
    if (!entry) {
        entry = {
            data: [],
            loading: false,
            error: null,
            subscribers: new Set(),
            lastFetchedAt: undefined,
        };
        cache.set(userId, entry);
    }
    return entry;
}

function notify(userId: string) {
    const entry = cache.get(userId);
    if (!entry) return;
    entry.subscribers.forEach((subscriber) => subscriber());
}

function getSnapshot(userId?: string): HookState {
    if (!userId) {
        return { results: [], loading: false, error: "Missing user id" };
    }
    const entry = getOrCreateEntry(userId);
    return {
        results: entry.data,
        loading: entry.loading,
        error: entry.error,
    };
}

export function useStudentResults(userId?: string) {
    const authFetch = useAuthFetch();
    const [state, setState] = useState<HookState>(() => getSnapshot(userId));

    useEffect(() => {
        if (!userId) {
            setState({ results: [], loading: false, error: "Missing user id" });
            return;
        }

        const entry = getOrCreateEntry(userId);

        const subscriber = () => {
            setState(getSnapshot(userId));
        };

        entry.subscribers.add(subscriber);

        const shouldAutoFetch = !entry.promise && !entry.loading && !entry.lastFetchedAt;
        if (shouldAutoFetch) {
            entry.promise = loadStudentResults(userId, authFetch).finally(() => {
                entry.promise = undefined;
            });
        }

        // Emit current state immediately
        subscriber();

        return () => {
            entry.subscribers.delete(subscriber);
        };
    }, [userId, authFetch]);

    const refresh = useCallback(async () => {
        if (!userId) return;
        const entry = getOrCreateEntry(userId);
        entry.lastFetchedAt = undefined; // allow auto-fetch to run again
        entry.promise = loadStudentResults(userId, authFetch, true).finally(() => {
            entry.promise = undefined;
        });
        await entry.promise;
    }, [userId, authFetch]);

    const memoizedState = useMemo(() => state, [state]);

    return {
        results: memoizedState.results,
        loading: memoizedState.loading,
        error: memoizedState.error,
        refresh,
    };
}

async function loadStudentResults(
    userId: string,
    authFetch: ReturnType<typeof useAuthFetch>,
    force = false
) {
    const entry = getOrCreateEntry(userId);

    if (!force && entry.loading) {
        return;
    }

    entry.loading = true;
    entry.error = null;
    notify(userId);

    try {
        const response = await authFetch(
            getFullUrl(API_ENDPOINTS.STUDENT_RESULTS(userId))
        );

        if (!response.ok) {
            let message = `Không thể tải dữ liệu tiến độ (HTTP ${response.status})`;
            try {
                const errorData = await response.json();
                if (errorData?.detail) {
                    message = errorData.detail;
                }
            } catch {
                // ignore json parse error, keep default message
            }

            entry.data = [];
            entry.error = message;
            entry.loading = false;
            entry.lastFetchedAt = Date.now();
            notify(userId);
            return;
        }

        const data = await response.json();
        entry.data = Array.isArray(data) ? (data as StudentTestResult[]) : [];
        entry.error = null;
        entry.lastFetchedAt = Date.now();
    } catch (error) {
        entry.data = [];
        entry.error = error instanceof Error ? error.message : "Đã xảy ra lỗi";
        entry.lastFetchedAt = Date.now();
    } finally {
        entry.loading = false;
        notify(userId);
    }
}
