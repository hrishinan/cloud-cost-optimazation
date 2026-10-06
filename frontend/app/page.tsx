'use client';

import { useState } from "react";

type Provider = "AWS" | "GCP" | "Azure";

export default function Home() {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [step, setStep] = useState(1);

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
                <button
                  key={item}
                  className={provider === item ? "provider selected" : "provider"}
                  onClick={() => setProvider(item)}
                >
                  <span className="provider-logo">{item === "Azure" ? "AZ" : item}</span>
                  <span>
                    <strong>{item === "AWS" ? "Amazon Web Services" : item === "GCP" ? "Google Cloud Platform" : "Microsoft Azure"}</strong>
                    <small>Connect and analyze your cloud costs</small>
                  </span>
                  <span className="radio">{provider === item ? "✓" : ""}</span>
                </button>
              ))}
            </div>

            <button
              className="primary-button"
              disabled={!provider}
              onClick={() => setStep(2)}
            >
              Continue
            </button>
          </>
        ) : (
          <>
            <button className="back-button" onClick={() => setStep(1)}>← Back</button>
            <h1>Connect {provider}</h1>
            <p className="subtitle">Enter your cloud credentials to connect your account.</p>

            {provider === "AWS" && (
              <div className="form">
                <label>Access Key ID<input placeholder="Enter AWS Access Key ID" /></label>
                <label>Secret Access Key<input type="password" placeholder="Enter AWS Secret Access Key" /></label>
                <label>Region<input defaultValue="ap-south-1" placeholder="AWS Region" /></label>
              </div>
            )}

            {provider === "GCP" && (
              <div className="form">
                <label>Project ID<input placeholder="Enter GCP Project ID" /></label>
                <label>Service Account Email<input placeholder="service-account@project.iam.gserviceaccount.com" /></label>
                <label>Private Key<textarea placeholder="Paste service account private key" rows={5} /></label>
              </div>
            )}

            {provider === "Azure" && (
              <div className="form">
                <label>Tenant ID<input placeholder="Enter Tenant ID" /></label>
                <label>Client ID<input placeholder="Enter Client ID" /></label>
                <label>Client Secret<input type="password" placeholder="Enter Client Secret" /></label>
                <label>Subscription ID<input placeholder="Enter Subscription ID" /></label>
              </div>
            )}

            <button className="primary-button">Connect {provider}</button>
            <p className="security-note">🔒 Credentials must be handled securely by the backend and should never be committed to Git.</p>
          </>
        )}
      </section>
    </main>
  );
}
