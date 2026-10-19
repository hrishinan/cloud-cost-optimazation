'use client';

import { useState } from "react";

type Provider = "AWS" | "GCP" | "Azure";
type ServiceCost = { service: string; amount: number; currency: string };
type DailyCost = { date: string; amount: number };
type Finding = {
  id: string; service: string; title: string; detail: string;
  action: string; risk: string; estimated_monthly_saving: number | null;
};
type CostData = {
  period: { start: string; end_exclusive: string };
  total: number; currency: string; services: ServiceCost[];
  daily: DailyCost[]; source: string; note: string;
};
type ScanData = { findings: Finding[]; scan_status: { service: string; status: string; message?: string; zones?: number }[]; supported_checks: string[]; note: string };

const API = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api`;

export default function Home() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [step, setStep] = useState(1);
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [accountId, setAccountId] = useState("");
  const [costs, setCosts] = useState<CostData | null>(null);
  const [scan, setScan] = useState<ScanData | null>(null);
  const [costError, setCostError] = useState("");
  const [gcpProjectId, setGcpProjectId] = useState("");
  const [gcpBillingTable, setGcpBillingTable] = useState("");
  const [gcpServiceAccountKey, setGcpServiceAccountKey] = useState("");

  async function connectAWS() {
    setLoading(true);
    setMessage("");
    setCostError("");
    setCosts(null);
    setScan(null);
    setAccountId("");
    try {
      const credentials = { access_key_id: accessKeyId, secret_access_key: secretAccessKey, region };
      const connectResponse = await fetch(`${API}/cloud/aws/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials),
      });
      const connectData = await connectResponse.json();
      if (!connectResponse.ok) throw new Error(connectData.detail || "AWS connection failed");
      setAccountId(connectData.account_id);
      setMessage(`Connected successfully. AWS Account: ${connectData.account_id}`);

      const [costResponse, scanResponse] = await Promise.all([
        fetch(`${API}/cloud/aws/costs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) }),
        fetch(`${API}/cloud/aws/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(credentials) }),
      ]);
      const costData = await costResponse.json();
      const scanData = await scanResponse.json();
      if (costResponse.ok) setCosts(costData as CostData);
      else setCostError(costData.detail || "Could not load AWS billing data.");
      if (scanResponse.ok) setScan(scanData as ScanData);
      else setCostError((old) => [old, scanData.detail || "Could not scan AWS resources."].filter(Boolean).join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AWS connection failed");
    } finally {
      setLoading(false);
    }
  }

  async function connectGCP() {
    setLoading(true);
    setMessage("");
    setCostError("");
    setCosts(null);
    setScan(null);
    try {
      let serviceAccountKey: Record<string, unknown> | null = null;
      const rawKey = gcpServiceAccountKey.trim();
      if (rawKey) {
        try {
          const parsed: unknown = JSON.parse(rawKey);
          if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) ||
              (parsed as Record<string, unknown>).type !== "service_account") {
            throw new Error("Expected a Google Cloud service-account JSON object.");
          }
          serviceAccountKey = parsed as Record<string, unknown>;
        } catch {
          throw new Error("Invalid Service Account JSON. Paste the complete, unmodified JSON key file, including its braces and quoted property names.");
        }
      }
      const payload = { project_id: gcpProjectId.trim(), billing_export_table: gcpBillingTable.trim() || null, service_account_key: serviceAccountKey };
      const connectResponse = await fetch(`${API}/cloud/gcp/connect`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      const connectData = await connectResponse.json();
      if (!connectResponse.ok) throw new Error(connectData.detail || "GCP connection failed");
      setMessage(`Connected successfully. GCP Project: ${connectData.project_id}`);
      const [costResponse, scanResponse] = await Promise.all([
        fetch(`${API}/cloud/gcp/costs`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
        fetch(`${API}/cloud/gcp/recommendations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }),
      ]);
      const costData = await costResponse.json();
      const scanData = await scanResponse.json();
      if (costResponse.ok) setCosts(costData as CostData);
      else setCostError(costData.detail || "Could not load GCP billing data.");
      if (scanResponse.ok) setScan(scanData as ScanData);
      else setCostError((old) => [old, scanData.detail || "Could not scan GCP resources."].filter(Boolean).join(" "));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "GCP connection failed");
    } finally {
      setGcpServiceAccountKey("");
      setLoading(false);
    }
  }

  function money(amount: number, currency: string) {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 2 }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
  }

  const maxServiceCost = Math.max(1, ...(costs?.services.map((item) => Math.abs(item.amount)) ?? [1]));
  const maxDailyCost = Math.max(1, ...(costs?.daily.map((item) => item.amount) ?? [1]));
  const maxBarCost = Math.max(1, ...(costs?.services.slice(0, 8).map((item) => item.amount) ?? [1]));

  return (
    <main className="setup-container">
      <section className="setup-card">
        <p className="eyebrow">Cloud Cost Optimization</p>
        <div className="steps"><span className={step === 1 ? "step active" : "step"}>1</span><span className="step-line" /><span className={step === 2 ? "step active" : "step"}>2</span></div>
        {step === 1 ? (
          <>
            <h1>Select your cloud</h1>
            <p className="subtitle">Choose the cloud provider you want to connect.</p>
            <div className="provider-list">
              {(["AWS", "GCP", "Azure"] as Provider[]).map((item) => (
                <button key={item} className={provider === item ? "provider selected" : "provider"} onClick={() => setProvider(item)}>
                  <span className="provider-logo">{item === "Azure" ? "AZ" : item}</span>
                  <span><strong>{item === "AWS" ? "Amazon Web Services" : item === "GCP" ? "Google Cloud Platform" : "Microsoft Azure"}</strong><small>Connect and analyze your cloud costs</small></span>
                  <span className="radio">{provider === item ? "✓" : ""}</span>
                </button>
              ))}
            </div>
            <button className="primary-button" disabled={!provider} onClick={() => setStep(2)}>Continue</button>
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setStep(1)}>← Back</button>
            <h1>Connect {provider}</h1>
            <p className="subtitle">Connect your account to review actual spend and supported resource checks.</p>
            {provider === "AWS" && (
              <>
                <div className="form">
                  <label>Access Key ID<input autoComplete="off" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="Enter AWS Access Key ID" /></label>
                  <label>Secret Access Key<input type="password" autoComplete="new-password" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} placeholder="Enter AWS Secret Access Key" /></label>
                  <label>AWS Region<input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="ap-south-1" /></label>
                </div>
                <button className="primary-button" disabled={loading || !accessKeyId || !secretAccessKey || !region} onClick={connectAWS}>{loading ? "Exploring AWS account..." : "Connect and analyze AWS"}</button>
                {message && <p className="connection-message">{message}</p>}
                {costError && <p className="connection-message error-message">{costError}</p>}
                {loading && <p className="security-note">Loading Cost Explorer billing data and scanning supported resource types. Large accounts may take some time.</p>}
                {costs && (
                  <section className="cost-dashboard" aria-live="polite">
                    <h2>AWS Cost Overview</h2>
                    <p className="subtitle">Account {accountId} · Month to date · {costs.source}</p>
                    <div className="cost-total"><small>Total month-to-date spend</small><strong>{money(costs.total, costs.currency)}</strong><small>{costs.period.start} through today. Billing data can be delayed.</small></div>
                    <h3>Daily spend trend</h3>
                    {costs.daily.length ? (
                      <div className="daily-chart" role="img" aria-label="Daily AWS spend bar chart">
                        {costs.daily.map((item) => (
                          <div className="daily-chart-item" key={item.date} title={`${item.date}: ${money(item.amount, costs.currency)}`}>
                            <span className="daily-bar" style={{ height: `${Math.max(3, item.amount / maxDailyCost * 100)}%` }} />
                            <small>{item.date.slice(-2)}</small>
                          </div>
                        ))}
                      </div>
                    ) : <p>No daily spend data returned for this period.</p>}
                    <h3>Cost by AWS service</h3>
                    {costs.services.length ? (
                      <div className="service-chart">
                        {costs.services.map((item) => (
                          <div className="service-chart-row" key={item.service}>
                            <div className="service-chart-label"><span>{item.service}</span><strong>{money(item.amount, item.currency)}</strong></div>
                            <div className="bar-track"><div className="service-bar" style={{ width: `${Math.max(1, Math.abs(item.amount) / maxServiceCost * 100)}%` }} /></div>
                          </div>
                        ))}
                      </div>
                    ) : <p>No service-level charges returned. Billing data may not be available yet.</p>}
                    <p className="security-note">{costs.note} Values reflect AWS billing data, not live metering.</p>
                  </section>
                )}
                {scan && (
                  <section className="cost-dashboard">
                    <h2>Optimization findings</h2>
                    <p className="subtitle">Resource scan for region {region}</p>
                    <div className="finding-summary">
                      <div><strong>{scan.findings.length}</strong><small>Items to review</small></div>
                      <div><strong>{scan.scan_status.filter((x) => x.status === "scanned").length}</strong><small>Checks completed</small></div>
                    </div>
                    {scan.findings.length ? (
                      <div className="findings-list">
                        {scan.findings.map((finding) => (
                          <article className="finding" key={`${finding.service}-${finding.id}`}>
                            <div className="finding-heading"><span className="finding-service">{finding.service}</span><span className={`risk risk-${finding.risk}`}>{finding.risk} risk</span></div>
                            <h3>{finding.title}</h3>
                            <p>{finding.detail}</p>
                            <p><strong>Suggested action:</strong> {finding.action}</p>
                            {finding.estimated_monthly_saving !== null && <p><strong>Estimated monthly saving:</strong> {money(finding.estimated_monthly_saving, costs?.currency ?? "USD")}</p>}
                            {finding.estimated_monthly_saving === null && <small>Saving estimate not yet calculated.</small>}
                          </article>
                        ))}
                      </div>
                    ) : <p>No findings from the currently implemented checks. This does not guarantee that the account is fully optimized.</p>}
                    <h3>Scan coverage</h3>
                    <div className="service-cost-list">
                      {scan.scan_status.map((item) => <div className="service-cost-row" key={item.service}><span>{item.service}</span><strong>{item.status.replaceAll("_", " ")}</strong></div>)}
                    </div>
                    <p className="security-note">{scan.note}</p>
                  </section>
                )}
              </>
            )}
            {provider === "GCP" && <>
              <div className="form">
                <label>GCP Project ID<input value={gcpProjectId} onChange={(e) => setGcpProjectId(e.target.value)} placeholder="my-gcp-project-id" /></label>
                <label>BigQuery Billing Export Table ID (optional for inventory)<input value={gcpBillingTable} onChange={(e) => setGcpBillingTable(e.target.value)} placeholder="billing-project.dataset.gcp_billing_export_v1_XXXXXX" /></label>
                <label>Service Account JSON Key (optional)<textarea value={gcpServiceAccountKey} onChange={(e) => setGcpServiceAccountKey(e.target.value)} placeholder="Paste test service-account JSON key" rows={5} autoComplete="off" /></label>
              </div>
              <p className="security-note">Testing only: this page uses HTTP, so a private key can be intercepted. Use only a temporary test-project key with least privilege; never use production credentials. Prefer VM Application Default Credentials and enable HTTPS before broader use. The key field is cleared after the request.</p>
              <button className="primary-button" disabled={loading || gcpProjectId.trim().length < 3} onClick={connectGCP}>{loading ? "Exploring GCP project..." : "Connect and analyze GCP"}</button>
              {message && <p className="connection-message">{message}</p>}
              {costError && <p className="connection-message error-message">{costError}</p>}
              {costs && <section className="cost-dashboard" aria-live="polite">
                <h2>GCP Cost Overview</h2>
                <p className="subtitle">Project {gcpProjectId} · Month to date · {costs.source}</p>
                <div className="cost-total"><small>Total month-to-date spend</small><strong>{money(costs.total, costs.currency)}</strong><small>{costs.period.start} through today. Billing data can be delayed.</small></div>
                <h3>Daily spend trend</h3>
                {costs.daily.length ? <div className="daily-chart" role="img" aria-label="Daily GCP spend bar chart">{costs.daily.map((item) => <div className="daily-chart-item" key={item.date} title={`${item.date}: ${money(item.amount, costs.currency)}`}><span className="daily-bar" style={{ height: `${Math.max(3, item.amount / Math.max(1, ...costs.daily.map((d) => d.amount)) * 100)}%` }} /><small>{item.date.slice(-2)}</small></div>)}</div> : <p>No daily spend data returned.</p>}
                <h3>Cost by GCP service</h3>
                {costs.services.length ? <div className="service-chart">{costs.services.map((item) => <div className="service-chart-row" key={item.service}><div className="service-chart-label"><span>{item.service}</span><strong>{money(item.amount, item.currency)}</strong></div><div className="bar-track"><div className="service-bar" style={{ width: `${Math.max(1, Math.abs(item.amount) / Math.max(1, ...costs.services.map((s) => Math.abs(s.amount))) * 100)}%` }} /></div></div>)}</div> : <p>Billing export may not be configured or may not contain data yet.</p>}
                <p className="security-note">{costs.note}</p>
              </section>}
              {scan && <section className="cost-dashboard"><h2>GCP Optimization Findings</h2><p className="subtitle">Project {gcpProjectId}</p>
                <div className="finding-summary"><div><strong>{scan.findings.length}</strong><small>Resources to review</small></div><div><strong>{scan.scan_status.filter((x) => x.status === "scanned").length}</strong><small>Checks completed</small></div></div>
                {scan.findings.length ? <div className="findings-list">{scan.findings.map((finding) => <article className="finding" key={`${finding.service}-${finding.id}`}><div className="finding-heading"><span className="finding-service">{finding.service}</span><span className={`risk risk-${finding.risk}`}>{finding.risk} risk</span></div><h3>{finding.title}</h3><p>{finding.detail}</p><p><strong>Suggested action:</strong> {finding.action}</p><small>Saving estimate not yet calculated.</small></article>)}</div> : <p>No running Compute Engine VMs were returned by the current check.</p>}
                <p className="security-note">{scan.note}</p>
              </section>}
            </>}
            {provider === "Azure" && <><div className="form"><label>Tenant ID<input placeholder="Enter Tenant ID" /></label><label>Client ID<input placeholder="Enter Client ID" /></label><label>Client Secret<input type="password" placeholder="Enter Client Secret" /></label><label>Subscription ID<input placeholder="Enter Subscription ID" /></label></div><button className="primary-button" disabled>Connect Azure (coming soon)</button></>}
            <p className="security-note">Credentials are used for these requests and are not persisted by this API. Never commit cloud credentials to Git. Use a dedicated read-only IAM role/identity for account analysis.</p>
          </>
        )}
      </section>
    </main>
  );
}
