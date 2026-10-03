type Recommendation = {
  resource_id: string;
  resource_type: string;
  title: string;
  estimated_monthly_saving: number;
  risk_level: string;
};

const recommendations: Recommendation[] = [
  { resource_id: "i-demo-001", resource_type: "EC2", title: "Review consistently idle EC2 instance", estimated_monthly_saving: 8400, risk_level: "low" },
  { resource_id: "vol-demo-001", resource_type: "EBS", title: "Review unattached EBS volume", estimated_monthly_saving: 1850, risk_level: "low" },
  { resource_id: "snap-demo-001", resource_type: "Snapshot", title: "Review old EBS snapshot", estimated_monthly_saving: 1120, risk_level: "low" },
];

export default function Home() {
  const savings = recommendations.reduce((sum, item) => sum + item.estimated_monthly_saving, 0);

  return (
    <main className="container">
      <header>
        <p className="eyebrow">Cloud Cost Optimization</p>
        <h1>Find savings before you spend.</h1>
        <p className="subtitle">AWS-first cost visibility and safe optimization recommendations.</p>
      </header>

      <section className="cards">
        <article className="card">
          <span>Potential monthly savings</span>
          <strong>₹{savings.toLocaleString("en-IN")}</strong>
        </article>
        <article className="card">
          <span>Recommendations</span>
          <strong>{recommendations.length}</strong>
        </article>
        <article className="card">
          <span>AWS actions</span>
          <strong>Read-only</strong>
        </article>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Optimization opportunities</h2>
          <span className="badge">MVP</span>
        </div>
        {recommendations.map((item) => (
          <div className="recommendation" key={item.resource_id}>
            <div>
              <small>{item.resource_type} · {item.resource_id}</small>
              <h3>{item.title}</h3>
            </div>
            <div className="saving">₹{item.estimated_monthly_saving.toLocaleString("en-IN")}/mo</div>
            <button>Review</button>
          </div>
        ))}
      </section>
    </main>
  );
}
