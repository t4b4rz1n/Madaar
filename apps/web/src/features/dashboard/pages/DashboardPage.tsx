import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { motion } from 'framer-motion';
import { People, Ticket, DiscountShape, Notification, Activity } from 'iconsax-reactjs';
import {
  getOverviewKPIs,
  getQueuesBreakdown,
  getWorkersResources,
  getWorkersGrowth,
  getVulnerabilitiesGrowth,
  getVulnerabilitySeverities,
  getAssetsGrowth,
  getScansThroughput,
  getScansStatus,
  getTemplatesGrowth,
  getUserRegistrations,
  getLicenseDistribution,
  getTopActiveTeams,
} from '../api/dashboardApi';

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[140px] text-base-content/50 font-mono text-xs py-8">
    <Activity size="20" className="text-base-content/40 mb-2" />
    {message}
  </div>
);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const title = label || payload[0]?.payload?.name || '';

    // Sort payload items by value descending
    const sortedPayload = [...payload]
      .filter((item: any) => item.value !== undefined && item.value !== null)
      .sort((a: any, b: any) => b.value - a.value);

    const isLarge = sortedPayload.length > 4;

    const translateName = (name: string) => {
      if (name === "Pending Tasks") return "Pending Tickets";
      if (name === "Vulnerabilities Found") return "Tickets Opened";
      if (name === "New Workers") return "New Support Staff";
      if (name === "Total Requests") return "Discounts Created";
      if (name === "Results Found") return "Discounts Claimed";
      if (name === "New Assets") return "Total Users";
      if (name === "New Templates") return "Notifications Broadcasted";
      if (name === "Registered Users") return "Registered Users";
      if (name === "Free") return "Standard User";
      if (name === "Pro") return "Premium User";
      if (name === "Enterprise") return "Enterprise Org";
      if (name === "Scans") return "Tickets Resolved";

      if (name.endsWith('_cpu')) {
        const staff = name.replace('_cpu', '');
        return `${staff} (Resolution Time)`;
      }
      if (name.endsWith('_memory')) {
        const staff = name.replace('_memory', '');
        return `${staff} (Active Chats)`;
      }

      return name;
    };

    return (
      <div className={`bg-base-100 border border-base-content/10 p-3.5 rounded-lg shadow-lg font-mono text-xs text-base-content z-50 ${isLarge ? 'min-w-[520px]' : 'min-w-[200px]'
        }`}>
        {title && <p className="text-base-content/60 mb-2 border-b border-base-content/10 pb-1.5 font-semibold">{title}</p>}
        <div className={isLarge ? "grid grid-cols-2 gap-x-6 gap-y-1.5" : "space-y-1.5"}>
          {sortedPayload.map((item: any, index: number) => {
            const color = item.color || item.payload.fill || item.payload.color || 'var(--color-primary)';
            const rawName = item.name || item.dataKey || '';
            const cleanName = translateName(rawName);
            const isPercentage = rawName.toLowerCase().includes('cpu') ||
              rawName.toLowerCase().includes('ram') ||
              rawName.toLowerCase().includes('memory') ||
              rawName.toLowerCase().includes('load');
            const formattedValue = isPercentage
              ? `${item.value.toLocaleString()}%`
              : item.value.toLocaleString();

            return (
              <div key={index} className="flex items-center justify-between gap-4 py-0.5">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-base-content/75 truncate">{cleanName}</span>
                </div>
                <span className="font-bold text-base-content shrink-0">{formattedValue}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

const StatCard = ({ title, value, icon: Icon, delay, subtitle }: { title: string, value: React.ReactNode, icon: any, delay: number, subtitle?: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className="bg-base-100 border border-base-content/10 rounded-2xl p-6 shadow-xs hover:border-primary/20 hover:shadow-md transition-all duration-300 relative overflow-hidden group"
  >
    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-primary/10 transition-all duration-500"></div>
    <div className="flex items-center justify-between relative z-10">
      <div>
        <p className="text-base-content/50 text-xs font-mono tracking-widest uppercase mb-2">{title}</p>
        <div className="flex items-baseline gap-2">
          {typeof value === 'string' ? (
            <h3 className="text-base-content text-3xl font-bold font-mono tracking-tight">{value}</h3>
          ) : (
            <div className="text-3xl font-bold font-mono tracking-tight text-base-content">{value}</div>
          )}
        </div>
        {subtitle && (
          <div className="text-base-content/60 text-[10px] font-mono mt-2 opacity-85 leading-normal">
            {subtitle}
          </div>
        )}
      </div>
      <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:border-primary/30 group-hover:bg-primary/20 transition-all duration-300">
        <Icon size="24" variant="Outline" />
      </div>
    </div>
  </motion.div>
);

interface ChartCardProps<T extends string> {
  title: string;
  delay: number;
  children: React.ReactNode;
  className?: string;
  activeFilter?: T;
  onFilterChange?: (filter: T) => void;
  extraHeader?: React.ReactNode;
  filterOptions?: readonly T[];
}

function ChartCard<T extends string = 'daily' | 'weekly' | 'monthly'>({
  title,
  delay,
  children,
  className = "",
  activeFilter,
  onFilterChange,
  extraHeader,
  filterOptions = ['daily', 'weekly', 'monthly'] as unknown as readonly T[]
}: ChartCardProps<T>) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`bg-base-100 border border-base-content/10 rounded-2xl p-5 shadow-xs hover:border-primary/20 transition-all duration-300 flex flex-col ${className}`}
    >
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-base-content/90 font-mono text-sm tracking-wider uppercase flex items-center gap-2 font-semibold">
          <div className="w-2 h-2 rounded-full bg-primary shadow-xs animate-pulse"></div>
          {title}
        </h3>
        <div className="flex items-center gap-3">
          {extraHeader}
          {activeFilter && onFilterChange && (
            <div className="flex bg-base-200 p-0.5 rounded-lg border border-base-content/5 text-[10px] font-mono">
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`px-2.5 py-1 rounded-md transition-all duration-200 capitalize font-medium cursor-pointer ${activeFilter === filter
                      ? 'bg-primary text-primary-content shadow-xs'
                      : 'text-base-content/60 hover:text-base-content'
                    }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex-1 w-full">
        {children}
      </div>
    </motion.div>
  );
}

const lineColors = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#10b981', // Green
  '#a855f7', // Purple
  '#f59e0b', // Amber
  '#06b6d4', // Cyan
  '#ec4899', // Pink
  '#14b8a6', // Teal
];

const DashboardPage = () => {
  // Loading and Mount states
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(false);

  // Period Filters
  const [workerFilter, setWorkerFilter] = useState<'1h' | '7h' | '24h'>('1h');
  const [workerGrowthFilter, setWorkerGrowthFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [vulnsFilter, setVulnsFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [assetsFilter, setAssetsFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [throughputFilter, setThroughputFilter] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [templatesFilter, setTemplatesFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [registrationsFilter, setRegistrationsFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [licenseFilter, setLicenseFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
  const [teamsFilter, setTeamsFilter] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // Resource Type Filter for Support Staff Stats Chart
  const [resourceType, setResourceType] = useState<'cpu' | 'memory'>('cpu');

  // API Data States
  const [overviewData, setOverviewData] = useState<any>(null);
  const [queuesData, setQueuesData] = useState<any>(null);
  const [workersResourcesData, setWorkersResourcesData] = useState<any>(null);
  const [workersGrowthData, setWorkersGrowthData] = useState<any>(null);
  const [vulnsGrowthData, setVulnsGrowthData] = useState<any>(null);
  const [severityPostureData, setSeverityPostureData] = useState<any>(null);
  const [assetsGrowthData, setAssetsGrowthData] = useState<any>(null);
  const [scansThroughputData, setScansThroughputData] = useState<any>(null);
  const [scansStatusData, setScansStatusData] = useState<any>(null);
  const [templatesGrowthData, setTemplatesGrowthData] = useState<any>(null);
  const [registrationsData, setRegistrationsData] = useState<any>(null);
  const [licenseDistributionData, setLicenseDistributionData] = useState<any>(null);
  const [topTeamsData, setTopTeamsData] = useState<any>(null);

  // Interaction States
  const [activeQueueIndex, setActiveQueueIndex] = useState(-1);
  const [activeSeverityIndex, setActiveSeverityIndex] = useState(-1);
  const [activeQueuePieIndex, setActiveQueuePieIndex] = useState(-1);
  const [activeLicenseIndex, setActiveLicenseIndex] = useState(-1);

  // Fetch all initial dashboard data on mount
  useEffect(() => {
    Promise.all([
      getOverviewKPIs(),
      getQueuesBreakdown(),
      getVulnerabilitySeverities(),
      getScansStatus(),
      getWorkersResources(workerFilter),
      getWorkersGrowth(workerGrowthFilter),
      getVulnerabilitiesGrowth(vulnsFilter),
      getAssetsGrowth(assetsFilter),
      getScansThroughput(throughputFilter),
      getTemplatesGrowth(templatesFilter),
      getUserRegistrations(registrationsFilter),
      getLicenseDistribution(licenseFilter),
      getTopActiveTeams(teamsFilter)
    ]).then(([
      overviewRes,
      queuesRes,
      severitiesRes,
      scansStatusRes,
      resourcesRes,
      workersGrowthRes,
      vulnsGrowthRes,
      assetsGrowthRes,
      throughputRes,
      templatesGrowthRes,
      registrationsRes,
      licenseRes,
      teamsRes
    ]) => {
      if (overviewRes?.data) setOverviewData(overviewRes.data);
      if (queuesRes?.data) setQueuesData(queuesRes.data);
      if (severitiesRes?.data) setSeverityPostureData(severitiesRes.data);
      if (scansStatusRes?.data) setScansStatusData(scansStatusRes.data);
      if (resourcesRes?.data) setWorkersResourcesData(resourcesRes.data);
      if (workersGrowthRes?.data) setWorkersGrowthData(workersGrowthRes.data);
      if (vulnsGrowthRes?.data) setVulnsGrowthData(vulnsGrowthRes.data);
      if (assetsGrowthRes?.data) setAssetsGrowthData(assetsGrowthRes.data);
      if (throughputRes?.data) setScansThroughputData(throughputRes.data);
      if (templatesGrowthRes?.data) setTemplatesGrowthData(templatesGrowthRes.data);
      if (registrationsRes?.data) setRegistrationsData(registrationsRes.data.user_registrations);
      if (licenseRes?.data) setLicenseDistributionData(licenseRes.data.license_distribution);
      if (teamsRes?.data) setTopTeamsData(teamsRes.data.top_teams);
    }).catch(err => {
      console.error("Error loading dashboard data", err);
    }).finally(() => {
      setLoading(false);
      isMounted.current = true;
    });
  }, []);

  // Fetch support agents resources by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getWorkersResources(workerFilter).then(res => {
      if (res?.data) setWorkersResourcesData(res.data);
    }).catch(err => console.error("Error fetching staff metrics", err));
  }, [workerFilter]);

  // Fetch staff growth by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getWorkersGrowth(workerGrowthFilter).then(res => {
      if (res?.data) setWorkersGrowthData(res.data);
    }).catch(err => console.error("Error fetching staff growth", err));
  }, [workerGrowthFilter]);

  // Fetch ticket growth by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getVulnerabilitiesGrowth(vulnsFilter).then(res => {
      if (res?.data) setVulnsGrowthData(res.data);
    }).catch(err => console.error("Error fetching tickets growth", err));
  }, [vulnsFilter]);

  // Fetch users growth by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getAssetsGrowth(assetsFilter).then(res => {
      if (res?.data) setAssetsGrowthData(res.data);
    }).catch(err => console.error("Error fetching users growth", err));
  }, [assetsFilter]);

  // Fetch discounts data by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getScansThroughput(throughputFilter).then(res => {
      if (res?.data) setScansThroughputData(res.data);
    }).catch(err => console.error("Error fetching discounts data", err));
  }, [throughputFilter]);

  // Fetch notifications growth by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getTemplatesGrowth(templatesFilter).then(res => {
      if (res?.data) setTemplatesGrowthData(res.data);
    }).catch(err => console.error("Error fetching notifications growth", err));
  }, [templatesFilter]);

  // Fetch user registrations by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getUserRegistrations(registrationsFilter).then(res => {
      if (res?.data) setRegistrationsData(res.data.user_registrations);
    }).catch(err => console.error("Error fetching user registrations", err));
  }, [registrationsFilter]);

  // Fetch user plans by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getLicenseDistribution(licenseFilter).then(res => {
      if (res?.data) setLicenseDistributionData(res.data.license_distribution);
    }).catch(err => console.error("Error fetching license distribution", err));
  }, [licenseFilter]);

  // Fetch top active agents by period filter (skip on mount)
  useEffect(() => {
    if (!isMounted.current) return;
    getTopActiveTeams(teamsFilter).then(res => {
      if (res?.data) setTopTeamsData(res.data.top_teams);
    }).catch(err => console.error("Error fetching active agents stats", err));
  }, [teamsFilter]);

  // --- DATA MAPPINGS ---

  // 1. Overview KPIs
  let ticketsHandledVal: React.ReactNode = "-";
  let ticketsSubtitle = undefined;

  if (overviewData) {
    if (overviewData.scans) {
      const discLaunched = overviewData.scans.discovery?.launched || 0;
      const discFinished = overviewData.scans.discovery?.finished || 0;
      const discFailed = overviewData.scans.discovery?.failed !== undefined
        ? overviewData.scans.discovery.failed
        : Math.max(0, discLaunched - discFinished);

      const vulnLaunched = overviewData.scans.vulnerability?.launched || 0;
      const vulnFinished = overviewData.scans.vulnerability?.finished || 0;
      const vulnFailed = overviewData.scans.vulnerability?.failed !== undefined
        ? overviewData.scans.vulnerability.failed
        : Math.max(0, vulnLaunched - vulnFinished);

      const totalLaunched = discLaunched + vulnLaunched;
      const totalFailed = discFailed + vulnFailed;

      // Card main value: opened / closed
      ticketsHandledVal = `${totalLaunched.toLocaleString()} / ${totalFailed.toLocaleString()}`;

      // Card subtitle
      ticketsSubtitle = (
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="text-base-content/50 font-bold">Standard:</span>
            <span className="flex items-center gap-0.5 font-bold" dir="ltr">
              <strong className="text-emerald-500 font-extrabold">{discFinished}</strong>
              <span className="text-base-content/30 font-light">/</span>
              <strong className="text-rose-500 font-bold">{discFailed}</strong>
            </span>
          </span>
          <span className="text-base-content/10">|</span>
          <span className="flex items-center gap-1">
            <span className="text-base-content/50 font-bold">Priority:</span>
            <span className="flex items-center gap-0.5 font-bold" dir="ltr">
              <strong className="text-emerald-500 font-extrabold">{vulnFinished}</strong>
              <span className="text-base-content/30 font-light">/</span>
              <strong className="text-rose-500 font-bold">{vulnFailed}</strong>
            </span>
          </span>
        </span>
      );
    } else if (overviewData.total_scans_completed !== undefined) {
      ticketsHandledVal = overviewData.total_scans_completed.toLocaleString();
    }
  }

  const stats = [
    { title: "Total Platform Users", value: overviewData ? overviewData.total_assets.toLocaleString() : "-", icon: People, delay: 0.1 },
    { title: "Support Tickets (Open / Closed)", value: ticketsHandledVal, subtitle: ticketsSubtitle, icon: Ticket, delay: 0.2 },
    { title: "Active Support Agents", value: overviewData ? `${overviewData.active_workers}` : "-", icon: People, delay: 0.3 },
    { title: "Active Discount Codes", value: overviewData ? overviewData.total_vulnerabilities.toLocaleString() : "-", icon: DiscountShape, delay: 0.4 },
    { title: "Notifications Broadcasted", value: overviewData ? overviewData.total_templates.toLocaleString() : "-", icon: Notification, delay: 0.5 },
    { title: "Unresolved Tickets", value: overviewData ? overviewData.total_queued_tasks.toLocaleString() : "-", icon: Ticket, delay: 0.6 }
  ];

  // 2. Queues Breakdown
  const queueColors = [
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#10b981', // Green
    '#3b82f6', // Blue
    '#a855f7', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
  ];

  const queueBreakdownMapped = queuesData?.queues
    ? queuesData.queues.map((q: any, idx: number) => ({
      name: q.queue_name.replace("Queue", "Tickets"),
      value: q.pending_tasks,
      color: queueColors[idx % queueColors.length]
    }))
    : [];

  // 3. Workers Resources (Support Agents Metrics)
  const workersResources = workersResourcesData?.workers_resources || {};
  const workerKeys = Object.keys(workersResources).map(key => key.replace("Worker", "Agent"));
  const rawWorkerKeys = Object.keys(workersResources);

  let labels = workersResourcesData?.labels || [];
  if (labels.length === 0) {
    const allLabels = new Set<string>();
    rawWorkerKeys.forEach((workerName) => {
      const logs = workersResources[workerName] || [];
      logs.forEach((log: any) => {
        if (log.label) allLabels.add(log.label);
      });
    });
    labels = Array.from(allLabels).sort();
  }

  const combinedWorkerData = labels.map((label: string) => {
    const dataPoint: any = { label };
    rawWorkerKeys.forEach((workerName) => {
      const logs = workersResources[workerName] || [];
      const match = logs.find((log: any) => log.label === label);
      const cleanKey = workerName.replace("Worker", "Agent");
      if (match) {
        dataPoint[`${cleanKey}_cpu`] = match.cpu;
        dataPoint[`${cleanKey}_memory`] = match.memory;
      }
    });
    return dataPoint;
  });

  const workerExtraHeader = (
    <div className="flex bg-base-200 p-0.5 rounded-lg border border-base-content/5 text-[10px] font-mono">
      {(['cpu', 'memory'] as const).map((type) => (
        <button
          key={type}
          onClick={() => setResourceType(type)}
          className={`px-2.5 py-1 rounded-md transition-all duration-200 uppercase font-medium cursor-pointer ${resourceType === type
              ? 'bg-primary text-primary-content shadow-xs'
              : 'text-base-content/60 hover:text-base-content'
            }`}
        >
          {type === 'memory' ? 'Active Chats' : 'Response Rate'}
        </button>
      ))}
    </div>
  );

  // 4. Support Staff Growth
  const workerGrowthMapped = workersGrowthData?.worker_growth
    ? workersGrowthData.worker_growth.map((item: any) => ({ label: item.label, value: item.value }))
    : [];

  // 5. Support Ticket Volume Growth
  const vulnerabilitiesTrendMapped = vulnsGrowthData?.vulnerability_discovery
    ? vulnsGrowthData.vulnerability_discovery.map((item: any) => ({ label: item.label, value: item.value }))
    : [];

  // 6. Support Ticket Priorities
  const severityPostureMapped = severityPostureData?.severity_posture
    ? severityPostureData.severity_posture.map((item: any) => {
      let fill = '#3b82f6';
      if (item.severity === 'critical') fill = '#ef4444';
      if (item.severity === 'high') fill = '#f97316';
      if (item.severity === 'medium') fill = '#eab308';
      if (item.severity === 'low') fill = '#3b82f6';
      if (item.severity === 'info') fill = '#06b6d4';
      const pName = item.severity === 'critical' ? 'Urgent' : item.severity.charAt(0).toUpperCase() + item.severity.slice(1);
      return { name: pName, value: item.count, fill };
    })
    : [];

  // 7. Platform Users Growth
  const assetGrowthMapped = assetsGrowthData?.asset_growth
    ? assetsGrowthData.asset_growth.map((item: any) => ({ label: item.label, value: item.value }))
    : [];

  // 8. Discount Codes Performance
  const throughputDataMapped = scansThroughputData?.scan_throughput
    ? scansThroughputData.scan_throughput.map((item: any) => ({
      label: item.label,
      requests: item.requests,
      results: item.results
    }))
    : [];

  // 9. Support Ticket Statuses
  const scanStatusDataMapped = scansStatusData?.scan_status_breakdown
    ? scansStatusData.scan_status_breakdown.map((item: any) => {
      let color = 'var(--color-primary)';
      if (item.status === 'running') color = '#3b82f6';
      if (item.status === 'failed') color = '#ef4444';
      if (item.status === 'completed' || item.status === 'finished') color = '#10b981';
      if (item.status === 'cancelled') color = '#f59e0b';
      const sName = item.status === 'running' ? 'In Progress' : item.status === 'failed' ? 'Open' : item.status === 'completed' || item.status === 'finished' ? 'Closed' : 'Cancelled';
      return { name: sName, value: item.count, color };
    })
    : [];

  // 10. Broadcast Deliveries
  const templateGrowthMapped = templatesGrowthData?.template_growth
    ? templatesGrowthData.template_growth.map((item: any) => ({ label: item.label, value: item.value }))
    : [];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[75vh] font-mono text-xs text-base-content/50 space-y-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
        </div>
        <p className="animate-pulse tracking-widest uppercase">Loading Admin Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 min-h-screen bg-base-200/30">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-between items-center"
      >
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-8 bg-primary shadow-xs" />
          <h1 className="text-2xl font-bold text-base-content font-mono tracking-wide">
            Admin Overview Dashboard <span className="text-primary animate-pulse">_</span>
          </h1>
        </div>
      </motion.div>

      {/* 1. Overview KPIs (Top Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <StatCard key={idx} title={stat.title} value={stat.value} icon={stat.icon} delay={stat.delay} subtitle={stat.subtitle} />
        ))}
      </div>

      {/* 3. Support Staff Active Chat Metrics */}
      <ChartCard
        title="Support Staff Metrics & Load"
        delay={0.3}
        activeFilter={workerFilter}
        onFilterChange={setWorkerFilter}
        filterOptions={['1h', '7h', '24h'] as const}
        extraHeader={workerExtraHeader}
      >
        {workerKeys.length > 0 ? (
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={combinedWorkerData} style={{ outline: 'none' }}>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} tickFormatter={(val) => `${val}%`} />
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                {workerKeys.length <= 5 && (
                  <Legend iconType="circle" wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, color: 'currentColor', opacity: 0.7, paddingTop: 10 }} />
                )}
                {workerKeys.map((workerName, idx) => {
                  const color = lineColors[idx % lineColors.length];
                  return (
                    <Line
                      key={workerName}
                      type="monotone"
                      dataKey={`${workerName}_${resourceType}`}
                      name={workerName}
                      stroke={color}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <EmptyState message="No staff activity logs found" />
        )}
      </ChartCard>

      {/* Row 3: Tickets Opened AreaChart (2/3) + Ticket Priorities Pie/Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 5. Support Ticket Volume Growth Chart */}
        <ChartCard
          title="Support Tickets Opened"
          delay={0.4}
          activeFilter={vulnsFilter}
          onFilterChange={setVulnsFilter}
          className="lg:col-span-2"
        >
          <div className="h-[220px] w-full">
            {vulnerabilitiesTrendMapped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={vulnerabilitiesTrendMapped} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="vulnsDiscoveryGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Area type="monotone" dataKey="value" name="Vulnerabilities Found" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#vulnsDiscoveryGrad)" activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No ticket volume trends available" />
            )}
          </div>
        </ChartCard>

        {/* 6. Ticket Priorities Donut/Pie Chart */}
        <ChartCard
          title="Ticket Priorities"
          delay={0.45}
        >
          <div className="h-[220px] w-full flex flex-col justify-between">
            {severityPostureMapped.length > 0 && severityPostureMapped.some((item: any) => item.value > 0) ? (
              <>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        {...{
                          activeIndex: activeSeverityIndex,
                          activeShape: { innerRadius: 30, outerRadius: 65 },
                          onMouseEnter: (_: any, index: number) => setActiveSeverityIndex(index),
                          onMouseLeave: () => setActiveSeverityIndex(-1),
                          data: severityPostureMapped,
                          cx: "50%",
                          cy: "50%",
                          innerRadius: 35,
                          outerRadius: 60,
                          paddingAngle: 5,
                          dataKey: "value",
                          stroke: "none"
                        } as any}
                      >
                        {severityPostureMapped.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 border-t border-base-content/10">
                  {severityPostureMapped.map((entry: any) => (
                    <div key={entry.name} className="flex items-center justify-between font-mono text-xs text-base-content">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.fill }} />
                        <span className="text-base-content/60 text-[10px]">{entry.name}</span>
                      </div>
                      <span className="font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No ticket priority data available" />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 4: Discount Codes Usage (2/3) + Ticket Status Breakdown (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 8. Discount Codes Usage Dual-axis Chart */}
        <ChartCard
          title="Discounts Created vs Claimed"
          delay={0.5}
          className="lg:col-span-2"
          activeFilter={throughputFilter}
          onFilterChange={setThroughputFilter}
        >
          <div className="h-[220px] w-full">
            {throughputDataMapped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={throughputDataMapped} style={{ outline: 'none' }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis yAxisId="left" orientation="left" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Legend iconType="circle" wrapperStyle={{ fontFamily: 'monospace', fontSize: 10, color: 'currentColor', opacity: 0.7, paddingTop: 10 }} />
                  <Line yAxisId="left" type="monotone" dataKey="requests" name="Total Requests" stroke="#818cf8" strokeWidth={3} dot={false} activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                  <Line yAxisId="right" type="monotone" dataKey="results" name="Results Found" stroke="#34d399" strokeWidth={3} dot={false} activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No discount performance data available" />
            )}
          </div>
        </ChartCard>

        {/* 9. Ticket Status Breakdown Pie Chart */}
        <ChartCard
          title="Ticket Status Breakdown"
          delay={0.55}
        >
          <div className="h-[220px] w-full flex flex-col justify-between">
            {scanStatusDataMapped.length > 0 && scanStatusDataMapped.some((item: any) => item.value > 0) ? (
              <>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        {...{
                          activeIndex: activeQueueIndex,
                          activeShape: { innerRadius: 30, outerRadius: 65 },
                          onMouseEnter: (_: any, index: number) => setActiveQueueIndex(index),
                          onMouseLeave: () => setActiveQueueIndex(-1),
                          data: scanStatusDataMapped,
                          cx: "50%",
                          cy: "50%",
                          innerRadius: 35,
                          outerRadius: 60,
                          paddingAngle: 5,
                          dataKey: "value",
                          stroke: "none"
                        } as any}
                      >
                        {scanStatusDataMapped.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1 pt-2 border-t border-base-content/10">
                  {scanStatusDataMapped.map((entry: any) => (
                    <div key={entry.name} className="flex flex-col items-center font-mono text-base-content">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-base-content/50 text-[10px]">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No ticket status data available" />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 5: Notification Delivery Rate AreaChart (2/3) + Ticket Channels Breakdown Pie/Donut (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 10. Notification Delivery Rate AreaChart */}
        <ChartCard
          title="Notification Delivery Rate"
          delay={0.6}
          className="lg:col-span-2"
          activeFilter={templatesFilter}
          onFilterChange={setTemplatesFilter}
        >
          <div className="h-[220px] w-full">
            {templateGrowthMapped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={templateGrowthMapped} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="tempGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Area type="monotone" dataKey="value" name="New Templates" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#tempGrowthGrad)" activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No broadcast metrics data available" />
            )}
          </div>
        </ChartCard>

        {/* 2. Support Ticket Channels Chart */}
        <ChartCard
          title="Ticket Channels Breakdown"
          delay={0.65}
        >
          <div className="h-[220px] w-full flex flex-col justify-between">
            {queueBreakdownMapped.length > 0 && queueBreakdownMapped.some((q: any) => q.value > 0) ? (
              <>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        {...{
                          activeIndex: activeQueuePieIndex,
                          activeShape: { innerRadius: 30, outerRadius: 65 },
                          onMouseEnter: (_: any, index: number) => setActiveQueuePieIndex(index),
                          onMouseLeave: () => setActiveQueuePieIndex(-1),
                          data: queueBreakdownMapped,
                          cx: "50%",
                          cy: "50%",
                          innerRadius: 35,
                          outerRadius: 60,
                          paddingAngle: 5,
                          dataKey: "value",
                          stroke: "none"
                        } as any}
                      >
                        {queueBreakdownMapped.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 gap-y-1.5 pt-2 border-t border-base-content/10 max-h-[60px] overflow-y-auto pr-1">
                  {queueBreakdownMapped.map((entry: any) => (
                    <div key={entry.name} className="flex items-center justify-between font-mono text-xs text-base-content">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-base-content/70">{entry.name}</span>
                      </div>
                      <span className="font-bold">{entry.value.toLocaleString()} Chats</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No ticket channel metrics available" />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 6: User Growth Trend (1/2) + Staff Growth Trend (1/2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7. User Growth Trend */}
        <ChartCard
          title="User Growth Trend"
          delay={0.7}
          activeFilter={assetsFilter}
          onFilterChange={setAssetsFilter}
        >
          <div className="h-[220px] w-full">
            {assetGrowthMapped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={assetGrowthMapped} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="assetGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Area type="monotone" dataKey="value" name="New Assets" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#assetGrowthGrad)" activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No user growth records" />
            )}
          </div>
        </ChartCard>

        {/* 4. Staff Growth Trend */}
        <ChartCard
          title="Support Staff Growth Trend"
          delay={0.75}
          activeFilter={workerGrowthFilter}
          onFilterChange={setWorkerGrowthFilter}
        >
          <div className="h-[220px] w-full">
            {workerGrowthMapped.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={workerGrowthMapped} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="workerGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Area type="monotone" dataKey="value" name="New Workers" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#workerGrowthGrad)" activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No staff growth data available" />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 7: User Plan Distribution (1/3) + Registrations (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Registrations */}
        <ChartCard
          title="Daily Registrations Trend"
          delay={0.8}
          className="lg:col-span-2"
          activeFilter={registrationsFilter}
          onFilterChange={setRegistrationsFilter}
        >
          <div className="h-[220px] w-full">
            {registrationsData && registrationsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={registrationsData} style={{ outline: 'none' }}>
                  <defs>
                    <linearGradient id="userRegGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                  <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                  <Area type="monotone" dataKey="value" name="Registered Users" stroke="#06b6d4" strokeWidth={3} fillOpacity={1} fill="url(#userRegGrad)" activeDot={{ r: 6, stroke: 'var(--color-bg-base-100)', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState message="No registration trends data" />
            )}
          </div>
        </ChartCard>

        {/* User Plan Distribution */}
        <ChartCard
          title="User Plan Distribution"
          delay={0.85}
          activeFilter={licenseFilter}
          onFilterChange={setLicenseFilter}
        >
          <div className="h-[220px] w-full flex flex-col justify-between">
            {licenseDistributionData && licenseDistributionData.some((d: any) => d.value > 0) ? (
              <>
                <div className="h-[140px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart style={{ outline: 'none' }}>
                      <Pie
                        {...{
                          activeIndex: activeLicenseIndex,
                          activeShape: { innerRadius: 30, outerRadius: 65 },
                          onMouseEnter: (_: any, index: number) => setActiveLicenseIndex(index),
                          onMouseLeave: () => setActiveLicenseIndex(-1),
                          data: licenseDistributionData,
                          cx: "50%",
                          cy: "50%",
                          innerRadius: 35,
                          outerRadius: 60,
                          paddingAngle: 5,
                          dataKey: "value",
                          stroke: "none"
                        } as any}
                      >
                        {licenseDistributionData.map((entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-x-2 gap-y-1 pt-2 border-t border-base-content/10">
                  {licenseDistributionData.map((entry: any) => (
                    <div key={entry.name} className="flex flex-col items-center font-mono text-base-content">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="text-base-content/50 text-[10px]">{entry.name}</span>
                      </div>
                      <span className="text-xs font-bold">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <EmptyState message="No plans distribution metrics" />
            )}
          </div>
        </ChartCard>
      </div>

      {/* Row 8: Top Performing Staff */}
      <ChartCard
        title="Top Performing Staff Members"
        delay={0.9}
        activeFilter={teamsFilter}
        onFilterChange={setTeamsFilter}
      >
        <div className="h-[220px] w-full">
          {topTeamsData && topTeamsData.length > 0 && topTeamsData.some((d: any) => d.value > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeamsData.map((item: any) => ({ ...item, label: item.label.replace("Team", "Agent").replace("SecOps", "Support Manager").replace("Org", "Manager") }))} style={{ outline: 'none' }}>
                <defs>
                  <linearGradient id="topTeamsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.2} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="currentColor" strokeOpacity={0.05} vertical={false} />
                <XAxis dataKey="label" stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                <YAxis stroke="currentColor" strokeOpacity={0.2} axisLine={false} tickLine={false} tick={{ fontFamily: 'monospace', fontSize: 10, fill: 'currentColor', fillOpacity: 0.5 }} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', fillOpacity: 0.03 }} wrapperStyle={{ zIndex: 1000 }} />
                <Bar dataKey="value" name="Scans" fill="url(#topTeamsGrad)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState message="No performance metrics logs available" />
          )}
        </div>
      </ChartCard>
    </div>
  );
};

export default DashboardPage;
