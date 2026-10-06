'use client';

import { useState } from "react";

type Provider = "AWS" | "GCP" | "Azure";

export default function Home() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [step, setStep] = useState(1);
  const [accessKeyId, setAccessKeyId] = useState("");
  const [secretAccessKey, setSecretAccessKey] = useState("");
  const [region, setRegion] = useState("ap-south-1");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function connectAWS() {
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch("http://localhost:8000/api/cloud/aws/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_key_id: accessKeyId,
          secret_access_key: secretAccessKey,
          region,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "AWS connection failed");
      setMessage(`Connected successfully. AWS Account: ${data.account_id}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "AWS connection failed");
    } finally {
      setLoading(false);
    }
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
                  <label>Access Key ID<input value={accessKeyId} onChange={(e) => setAccessKeyId(e.target.value)} placeholder="Enter AWS Access Key ID" /></label>
                  <label>Secret Access Key<input type="password" value={secretAccessKey} onChange={(e) => setSecretAccessKey(e.target.value)} placeholder="Enter AWS Secret Access Key" /></label>
                  <label>Region<input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="AWS Region" /></label>
                </div>
                <button className="primary-button" disabled={loading || !accessKeyId || !secretAccessKey || !region} onClick={connectAWS}>
                  {loading ? "Connecting..." : "Connect AWS"}
                </button>
                {message && <p className="connection-message">{message}</p>}
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

            <p className="security-note">🔒 Credentials are sent to the backend for validation. Never commit cloud credentials to Git.</p>
          </>
        )}
      </section>
    </main>
  );
}
