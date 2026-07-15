import { useCallback, useEffect, useMemo, useState } from 'react';
import type { HistoryItem } from '../components/QueryHistory';
import apiService from '../services/api';
import type { DataSourceInfo, QueryRecord, ReportSummary, SemanticField } from '../services/api';

const toHistoryItems = (records: QueryRecord[]): HistoryItem[] => records.slice(0, 20).map((record) => ({
  id: String(record.id),
  query: record.query,
  timestamp: new Date(record.created_at),
  hasError: record.status !== 'success',
  rowCount: record.row_count,
}));

const errorMessage = (reason: unknown) => reason instanceof Error ? reason.message : String(reason);

const useWorkspaceData = (enabled: boolean) => {
  const [dataSources, setDataSources] = useState<DataSourceInfo[]>([]);
  const [semanticFields, setSemanticFields] = useState<SemanticField[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [queryRecords, setQueryRecords] = useState<QueryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!enabled) return;
    let isActive = true;

    Promise.allSettled([
      apiService.getDataSources(),
      apiService.getSemanticLayer(),
      apiService.getReports(),
      apiService.getQueryHistory(100),
    ]).then(([sources, fields, reportList, records]) => {
      if (!isActive) return;
      const errors: string[] = [];

      if (sources.status === 'fulfilled') setDataSources(sources.value);
      else errors.push(`数据源：${errorMessage(sources.reason)}`);

      if (fields.status === 'fulfilled') setSemanticFields(fields.value);
      else errors.push(`语义层：${errorMessage(fields.reason)}`);

      if (reportList.status === 'fulfilled') setReports(reportList.value);
      else errors.push(`报表：${errorMessage(reportList.reason)}`);

      if (records.status === 'fulfilled') setQueryRecords(records.value);
      else errors.push(`查询记录：${errorMessage(records.reason)}`);

      setLoadError(errors.join('；'));
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, [enabled]);

  const refreshDataSources = useCallback(async () => {
    const sources = await apiService.getDataSources();
    setDataSources(sources);
    return sources;
  }, []);

  const refreshSemanticFields = useCallback(async () => {
    const fields = await apiService.getSemanticLayer();
    setSemanticFields(fields);
    return fields;
  }, []);

  const refreshReports = useCallback(async () => {
    const reportList = await apiService.getReports();
    setReports(reportList);
    return reportList;
  }, []);

  const refreshQueryRecords = useCallback(async () => {
    const records = await apiService.getQueryHistory(100);
    setQueryRecords(records);
    return records;
  }, []);

  const clearWorkspace = useCallback(() => {
    setDataSources([]);
    setSemanticFields([]);
    setReports([]);
    setQueryRecords([]);
    setLoadError('');
    setIsLoading(true);
  }, []);

  const history = useMemo(() => toHistoryItems(queryRecords), [queryRecords]);

  return {
    dataSources,
    semanticFields,
    reports,
    queryRecords,
    history,
    isLoading,
    loadError,
    refreshDataSources,
    refreshSemanticFields,
    refreshReports,
    refreshQueryRecords,
    clearWorkspace,
  };
};

export default useWorkspaceData;
