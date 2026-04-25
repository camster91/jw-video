import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Video } from "../types";

// Mock data for exclusive content
const exclusiveContent: Video[] = [
	{
		key: "excl-1",
		title: "Behind the Scenes: Exclusive Documentary",
		description: "Go behind the camera with exclusive footage",
		thumbnailUrl: "https://picsum.photos/seed/excl1/400/225",
		duration: 3600,
		categoryKey: "exclusive",
		isPremium: true,
	},
	{
		key: "excl-2",
		title: "Director's Cut: Extended Edition",
		description: "Unseen footage and extended scenes",
		thumbnailUrl: "https://picsum.photos/seed/excl2/400/225",
		duration: 7200,
		categoryKey: "exclusive",
		isPremium: true,
	},
	{
		key: "excl-3",
		title: "Early Access: Season Premiere",
		description: "Watch new episodes before anyone else",
		thumbnailUrl: "https://picsum.photos/seed/excl3/400/225",
		duration: 2700,
		categoryKey: "exclusive",
		isPremium: true,
	},
	{
		key: "excl-4",
		title: "Premium Originals: Limited Series",
		description: "Exclusive content only for premium members",
		thumbnailUrl: "https://picsum.photos/seed/excl4/400/225",
		duration: 3000,
		categoryKey: "exclusive",
		isPremium: true,
	},
];

const earlyAccessContent: Video[] = [
	{
		key: "early-1",
		title: "Next Episode Preview",
		description: "Available 1 week early for premium",
		thumbnailUrl: "https://picsum.photos/seed/early1/400/225",
		duration: 1800,
		categoryKey: "early-access",
		isPremium: true,
		earlyAccessDate: "2026-04-23",
	},
	{
		key: "early-2",
		title: "Season Finale Sneak Peek",
		description: "Premium members watch first",
		thumbnailUrl: "https://picsum.photos/seed/early2/400/225",
		duration: 2400,
		categoryKey: "early-access",
		isPremium: true,
		earlyAccessDate: "2026-04-30",
	},
];

interface PremiumFeaturesProps {
	onVideoSelect?: (video: Video) => void;
}

export function PremiumFeatures({ onVideoSelect }: PremiumFeaturesProps) {
	const _navigate = useNavigate();
	const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">(
		"yearly",
	);
	const [adFreeEnabled, setAdFreeEnabled] = useState(true);
	const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

	const monthlyPrice = 9.99;
	const yearlyPrice = 99.99;
	const yearlySavings = Math.round(
		(1 - yearlyPrice / (monthlyPrice * 12)) * 100,
	);

	const features = [
		{ name: "Ad-free experience", free: false, premium: true, icon: "🚫" },
		{ name: "4K Ultra HD streaming", free: false, premium: true, icon: "📺" },
		{ name: "Download for offline", free: false, premium: true, icon: "📥" },
		{ name: "Early access content", free: false, premium: true, icon: "⚡" },
		{ name: "Exclusive originals", free: false, premium: true, icon: "⭐" },
		{
			name: "Multiple devices",
			free: "2 devices",
			premium: "5 devices",
			icon: "📱",
		},
		{ name: "Dolby Atmos audio", free: false, premium: true, icon: "🔊" },
		{ name: "Priority support", free: false, premium: true, icon: "💬" },
	];

	const handleSubscribe = (plan: string) => {
		setSelectedPlan(plan);
		// Payment integration placeholder
		console.log(`Selected plan: ${plan}`);
	};

	return (
		<div className="page premium-features-page">
			{/* Hero Section */}
			<section className="premium-hero">
				<div className="premium-hero-content">
					<h1 className="premium-title">
						<span className="premium-gradient">Upgrade to Premium</span>
					</h1>
					<p className="premium-subtitle">
						Unlock the ultimate viewing experience with exclusive content, early
						access, and ad-free streaming.
					</p>

					{/* Billing Toggle */}
					<div className="billing-toggle">
						<span
							className={`billing-label ${billingPeriod === "monthly" ? "active" : ""}`}
						>
							Monthly
						</span>
						<button
							type="button"
							className="billing-switch"
							onClick={() =>
								setBillingPeriod(
									billingPeriod === "monthly" ? "yearly" : "monthly",
								)
							}
							aria-label="Toggle billing period"
						>
							<div
								className={`switch-track ${billingPeriod === "yearly" ? "active" : ""}`}
							>
								<div className="switch-thumb" />
							</div>
						</button>
						<span
							className={`billing-label ${billingPeriod === "yearly" ? "active" : ""}`}
						>
							Yearly <span className="save-badge">Save {yearlySavings}%</span>
						</span>
					</div>
				</div>
			</section>

			{/* Pricing Cards */}
			<section className="pricing-section">
				<div className="pricing-cards">
					{/* Free Plan */}
					<div className="pricing-card free-plan">
						<div className="plan-header">
							<h3 className="plan-name">Free</h3>
							<div className="plan-price">
								<span className="currency">$</span>
								<span className="amount">0</span>
								<span className="period">/forever</span>
							</div>
						</div>
						<ul className="plan-features">
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Access to content library</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>HD streaming (720p)</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>2 devices</span>
							</li>
							<li className="feature-item excluded">
								<span className="feature-icon">✕</span>
								<span>Ad-free experience</span>
							</li>
							<li className="feature-item excluded">
								<span className="feature-icon">✕</span>
								<span>4K Ultra HD</span>
							</li>
							<li className="feature-item excluded">
								<span className="feature-icon">✕</span>
								<span>Offline downloads</span>
							</li>
						</ul>
						<button type="button" className="plan-btn current-plan" disabled>
							Current Plan
						</button>
					</div>

					{/* Premium Plan */}
					<div
						className={`pricing-card premium-plan ${selectedPlan ? "selected" : ""}`}
					>
						<div className="popular-badge">Most Popular</div>
						<div className="plan-header">
							<h3 className="plan-name">Premium</h3>
							<div className="plan-price">
								<span className="currency">$</span>
								<span className="amount">
									{billingPeriod === "monthly" ? monthlyPrice : yearlyPrice}
								</span>
								<span className="period">
									/{billingPeriod === "monthly" ? "month" : "year"}
								</span>
							</div>
							{billingPeriod === "yearly" && (
								<p className="yearly-note">
									Billed annually (${yearlyPrice}/year)
								</p>
							)}
						</div>
						<ul className="plan-features">
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Everything in Free, plus:</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Ad-free experience</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>4K Ultra HD + HDR</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Offline downloads</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Early access content</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Exclusive originals</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>5 devices</span>
							</li>
							<li className="feature-item included">
								<span className="feature-icon">✓</span>
								<span>Dolby Atmos audio</span>
							</li>
						</ul>
						<button
							type="button"
							className="plan-btn premium-btn"
							onClick={() => handleSubscribe("premium")}
						>
							{selectedPlan ? "Processing..." : "Start Free Trial"}
						</button>
						<p className="trial-note">
							7-day free trial, then{" "}
							{billingPeriod === "monthly"
								? `$${monthlyPrice}/month`
								: `$${yearlyPrice}/year`}
						</p>
					</div>
				</div>
			</section>

			{/* Feature Comparison Table */}
			<section className="comparison-section">
				<h2 className="section-title">Compare Plans</h2>
				<div className="comparison-table">
					<div className="comparison-header">
						<div className="feature-name">Feature</div>
						<div className="plan-column free-column">Free</div>
						<div className="plan-column premium-column">Premium</div>
					</div>
					{features.map((feature) => (
						<div key={feature.name} className="comparison-row">
							<div className="feature-name">
								<span className="feature-icon-small">{feature.icon}</span>
								{feature.name}
							</div>
							<div className="plan-column free-column">
								{feature.free === true ? (
									<span className="check-mark">✓</span>
								) : feature.free === false ? (
									<span className="cross-mark">✕</span>
								) : (
									<span className="text-value">{feature.free}</span>
								)}
							</div>
							<div className="plan-column premium-column">
								{feature.premium === true ? (
									<span className="check-mark">✓</span>
								) : feature.premium === false ? (
									<span className="cross-mark">✕</span>
								) : (
									<span className="text-value">{feature.premium}</span>
								)}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Ad-Free Experience Section */}
			<section className="ad-free-section">
				<div className="ad-free-content">
					<div className="ad-free-icon">🚫</div>
					<h2 className="section-title">Ad-Free Experience</h2>
					<p className="section-description">
						Enjoy uninterrupted viewing with zero commercials. Premium members
						get complete ad-free streaming across all devices.
					</p>
					<div className="ad-free-toggle">
						<label className="toggle-label">
							<span className="toggle-text">Enable Ad-Free Mode</span>
							<button
								type="button"
								className={`toggle-switch ${adFreeEnabled ? "active" : ""}`}
								onClick={() => setAdFreeEnabled(!adFreeEnabled)}
								aria-pressed={adFreeEnabled}
							>
								<div className="toggle-track">
									<div className="toggle-thumb" />
								</div>
							</button>
						</label>
						{adFreeEnabled && (
							<p className="toggle-hint">
								✓ Ad-free mode enabled (Premium required)
							</p>
						)}
					</div>
				</div>
			</section>

			{/* Early Access Section */}
			<section className="early-access-section">
				<h2 className="section-title">
					<span className="section-icon">⚡</span>
					Early Access Content
				</h2>
				<p className="section-description">
					Watch new episodes and premieres before anyone else. Premium members
					get exclusive early access up to 1 week in advance.
				</p>
				<div className="content-grid">
					{earlyAccessContent.map((video) => (
						<div key={video.key} className="early-access-card">
							<div className="early-access-image">
								<img
									src={video.thumbnailUrl}
									alt={video.title}
									loading="lazy"
								/>
								<div className="early-access-badge">
									<span className="badge-icon">🔒</span>
									<span>Premium</span>
								</div>
								{video.earlyAccessDate && (
									<div className="early-access-date">
										Available:{" "}
										{new Date(video.earlyAccessDate).toLocaleDateString()}
									</div>
								)}
							</div>
							<div className="early-access-info">
								<h4 className="early-access-title">{video.title}</h4>
								<p className="early-access-desc">{video.description}</p>
								<button
									type="button"
									className="early-access-btn"
									onClick={() => handleSubscribe("early-access")}
								>
									Unlock Early Access
								</button>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Exclusive Content Section */}
			<section className="exclusive-section">
				<h2 className="section-title">
					<span className="section-icon">⭐</span>
					Exclusive Content
				</h2>
				<p className="section-description">
					Access premium originals, behind-the-scenes content, director's cuts,
					and exclusive documentaries available only to premium members.
				</p>
				<div className="content-grid">
					{exclusiveContent.map((video) => (
						<div key={video.key} className="exclusive-card">
							<div className="exclusive-image">
								<img
									src={video.thumbnailUrl}
									alt={video.title}
									loading="lazy"
								/>
								<div className="exclusive-badge">
									<span className="badge-icon">⭐</span>
									<span>Exclusive</span>
								</div>
								<div className="exclusive-overlay">
									<button
										type="button"
										className="play-overlay-btn"
										onClick={() => handleSubscribe("exclusive")}
									>
										<svg
											width="48"
											height="48"
											viewBox="0 0 24 24"
											fill="currentColor"
										>
											<path d="M8 5v14l11-7z" />
										</svg>
									</button>
								</div>
							</div>
							<div className="exclusive-info">
								<h4 className="exclusive-title">{video.title}</h4>
								<p className="exclusive-desc">{video.description}</p>
								<div className="exclusive-meta">
									<span className="duration">
										{formatDuration(video.duration)}
									</span>
									<span className="quality-badge">4K</span>
								</div>
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Payment Integration Placeholder */}
			{selectedPlan && (
				<div className="payment-modal-overlay">
					<div className="payment-modal">
						<button
							type="button"
							className="modal-close"
							onClick={() => setSelectedPlan(null)}
							aria-label="Close"
						>
							✕
						</button>
						<div className="payment-content">
							<h3 className="payment-title">Complete Your Subscription</h3>
							<p className="payment-subtitle">
								You selected the <strong>Premium</strong> plan
							</p>
							<div className="payment-summary">
								<div className="summary-row">
									<span>Plan</span>
									<span>Premium ({billingPeriod})</span>
								</div>
								<div className="summary-row">
									<span>Price</span>
									<span>
										${billingPeriod === "monthly" ? monthlyPrice : yearlyPrice}
									</span>
								</div>
								<div className="summary-row total">
									<span>Total</span>
									<span>
										${billingPeriod === "monthly" ? monthlyPrice : yearlyPrice}
									</span>
								</div>
							</div>
							<div className="payment-methods">
								<p className="methods-label">Payment Method</p>
								<div className="method-options">
									<button type="button" className="method-option selected">
										💳 Credit Card
									</button>
									<button type="button" className="method-option">
										🅿️ PayPal
									</button>
									<button type="button" className="method-option">
										🍎 Apple Pay
									</button>
									<button type="button" className="method-option">
										🤖 Google Pay
									</button>
								</div>
							</div>
							<div className="payment-form-placeholder">
								<div className="form-field">
									<label>Card Number</label>
									<input
										type="text"
										placeholder="•••• •••• •••• ••••"
										disabled
									/>
								</div>
								<div className="form-row">
									<div className="form-field">
										<label>Expiry</label>
										<input type="text" placeholder="MM/YY" disabled />
									</div>
									<div className="form-field">
										<label>CVV</label>
										<input type="text" placeholder="•••" disabled />
									</div>
								</div>
							</div>
							<button type="button" className="payment-submit-btn">
								🔒 Complete Payment (Demo)
							</button>
							<p className="payment-secure">
								🔒 Your payment information is secure and encrypted
							</p>
						</div>
					</div>
				</div>
			)}

			{/* FAQ Section */}
			<section className="faq-section">
				<h2 className="section-title">Frequently Asked Questions</h2>
				<div className="faq-list">
					<details className="faq-item">
						<summary className="faq-question">
							How does the free trial work?
						</summary>
						<div className="faq-answer">
							<p>
								Start with a 7-day free trial. No charges during the trial
								period. Cancel anytime before the trial ends to avoid being
								charged.
							</p>
						</div>
					</details>
					<details className="faq-item">
						<summary className="faq-question">
							Can I cancel my subscription anytime?
						</summary>
						<div className="faq-answer">
							<p>
								Yes! You can cancel your premium subscription at any time. Your
								premium benefits will continue until the end of your billing
								period.
							</p>
						</div>
					</details>
					<details className="faq-item">
						<summary className="faq-question">
							How many devices can I use?
						</summary>
						<div className="faq-answer">
							<p>
								Premium members can stream on up to 5 devices simultaneously.
								Free members are limited to 2 devices.
							</p>
						</div>
					</details>
					<details className="faq-item">
						<summary className="faq-question">
							What quality can I expect?
						</summary>
						<div className="faq-answer">
							<p>
								Premium members get access to 4K Ultra HD, HDR, and Dolby Atmos
								audio. Free members stream in HD (720p).
							</p>
						</div>
					</details>
				</div>
			</section>
		</div>
	);
}

function formatDuration(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	if (hours > 0) {
		return `${hours}h ${minutes}m`;
	}
	return `${minutes}m`;
}
