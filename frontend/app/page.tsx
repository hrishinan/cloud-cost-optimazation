'use client';

import { useState } from "react";

type Provider = "AWS" | "GCP" | "Azure";
type CostData = {
  period: { start: string; end_exclusive: string };
  total: number;
  currency: string;
  services: { service: string; amount: number; currency: string }[];
  source: string;
};

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
  const [costError, setCostError] = useState("");

  async function connectAWS() {
    setLoading(true);
    setMessage("");
    setCostError("");
    setCosts(null);
    setAccountId("");
    try {
      const credentials = {
        access_key_id: accessKeyId,
        secret_access_key: secretAccessKey,
        region,
      };
      const connectResponse = await fetch("http://localhost:8000/api/cloud/aws/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const connectData = await connectResponse.json();
      if (!connectResponse.ok) throw new Error(connectData.detail || "AWS connection failed");

      setAccountId(connectData.account_id);
      setMessage(`Connected successfully. AWS Account: ${connectData.account_id}`);

      const costResponse = await fetch("http://localhost:8000/api/cloud/aws/costs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const costData = await costResponse.json();
      if (!costResponse.ok) {
        setCostError(costData.detail || "Connected to AWS, but could not load cost data.");
      } else {
        setCosts(costData as CostData);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AWS connection failed");
    } finally {
      setLoading(false);
    }
  }

  function formatMoney(amount: number, currency: string) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  }

  return (
    <main className="setup-container">
      <section className="setup-card">
        <p className="eyebrow">Cloud Cost Optimization</p>
        <div className="steps">
          <span className={step === 1 ? "step active" : "step"}>1</span>
          <span className="step-line" />
          <span className={step === 2 ? "step active" : "step"}>2</span>
        </div>

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
            <p className="subtitle">Enter your cloud credentials to connect your account.</p>

            {provider === "AWS" && (
              <>
                <div className="form">
                  <label>Access Key ID<input autoComplete="off" value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="Enter AWS Access Key ID" /></label>
                  <label>Secret Access Key<input type="password" autoComplete="new-password" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} placeholder="Enter AWS Secret Access Key" /></label>
                  <label>Region<input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="AWS Region" /></label>
                </div>
                <button className="primary-button" disabled={loading || !accessKeyId || !secretAccessKey || !region} onClick={connectAWS}>
                  {loading ? "Connecting and loading costs..." : "Connect AWS"}
                </button>
                {message && <p className="connection-message">{message}</p>}
                {costError && <p className="connection-message">{costError}</p>}
                {costs && (
                  <section className="cost-dashboard" aria-live="polite">
                    <h2>AWS Cost Dashboard</h2>
                    <p className="subtitle">Account {accountId} · Current month to date</p>
                    <div className="cost-total">
                      <small>Total spend</small>
                      <strong>{formatMoney(costs.total, costs.currency)}</strong>
                      <small>{costs.period.start} through today · Source: {costs.source}</small>
                    </div>
                    <h3>Cost by AWS service</h3>
                    {costs.services.length === 0 ? (
                      <p>No cost entries were returned for this period. AWS billing data can be delayed.</p>
                    ) : (
                      <div className="service-cost-list">
                        {costs.services.map((item) => (
                          <div className="service-cost-row" key={item.service}>
                            <span>{item.service}</span>
                            <strong>{formatMoney(item.amount, item.currency)}</strong>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="security-note">These are actual billing figures from Cost Explorer, not estimated savings. Optimization recommendations are still demo data.</p>
                  </section>
                )}
              </>
            )}

            {provider === "GCP" && (
              <>
                <div className="form">
                  <label>Project ID<input placeholder="Enter GCP Project ID" /></label>
                  <label>Service Account Email<input placeholder="service-account@project.iam.gserviceaccount.com" /></label>
                  <label>Private Key<textarea placeholder="Paste service account private key" rows={5} /></label>
                </div>
                <button className="primary-button" disabled>Connect GCP (coming soon)</button>
              </>
            )}

            {provider === "Azure" && (
              <>
                <div className="form">
                  <label>Tenant ID<input placeholder="Enter Tenant ID" /></label>
                  <label>Client ID<input placeholder="Enter Client ID" /></label>
                  <label>Client Secret<input type="password" placeholder="Enter Client Secret" /></label>
                  <label>Subscription ID<input placeholder="Enter Subscription ID" /></label>
                </div>
                <button className="primary-button" disabled>Connect Azure (coming soon)</button>
              </>
            )}

            <p className="security-note">Credentials are used for this request only and are not saved by this API. Never commit cloud credentials to Git.</p>
          </>
        )}
      </section>
    </main>
  );
}
