import { Cast, Monitor, Play, Tv, Volume2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { type CastDevice, CastingService } from "../services/CastingService";

export function CastButton() {
	const [showCastMenu, setShowCastMenu] = useState(false);
	const [isCasting, setIsCasting] = useState(false);
	const [isConnecting, setIsConnecting] = useState(false);
	const [availableDevices, setAvailableDevices] = useState<CastDevice[]>([]);
	const [currentDevice, setCurrentDevice] = useState<CastDevice | null>(null);
	const [showCastControls, setShowCastControls] = useState(false);

	// Subscribe to casting state
	useEffect(() => {
		const unsubscribe = CastingService.subscribe((state) => {
			setIsCasting(state.isCasting);
			setIsConnecting(state.isConnecting);
			setAvailableDevices(state.availableDevices);
			setCurrentDevice(state.currentDevice);
		});

		return unsubscribe;
	}, []);

	// Scan for devices when menu opens
	useEffect(() => {
		if (showCastMenu) {
			CastingService.scanForDevices();
		}
	}, [showCastMenu]);

	const handleCastClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (isCasting) {
			setShowCastControls(!showCastControls);
		} else {
			setShowCastMenu(!showCastMenu);
		}
	};

	const handleDeviceSelect = async (device: CastDevice) => {
		setIsConnecting(true);
		setShowCastMenu(false);

		// Mock casting - in production, pass actual video URL
		const success = await CastingService.startCasting(
			device.id,
			"https://example.com/video.mp4",
			"Sample Video",
			"https://example.com/poster.jpg",
		);

		if (success) {
			setShowCastControls(true);
		} else {
			setIsConnecting(false);
		}
	};

	const handleStopCasting = async () => {
		await CastingService.stopCasting();
		setShowCastControls(false);
		setShowCastMenu(false);
	};

	const getDeviceIcon = (type: CastDevice["type"]) => {
		switch (type) {
			case "chromecast":
				return <Cast size={20} />;
			case "airplay":
				return <Monitor size={20} />;
			case "smarttv":
				return <Tv size={20} />;
			default:
				return <Cast size={20} />;
		}
	};

	const getDeviceLabel = (type: CastDevice["type"]) => {
		switch (type) {
			case "chromecast":
				return "Chromecast";
			case "airplay":
				return "AirPlay";
			case "smarttv":
				return "Smart TV";
			default:
				return "Device";
		}
	};

	return (
		<div className="cast-button-container">
			<button
				type="button"
				onClick={handleCastClick}
				className={`control-btn cast-btn ${isCasting ? "casting" : ""}`}
				aria-label={isCasting ? "Cast controls" : "Cast to device"}
				aria-expanded={showCastMenu || showCastControls}
			>
				{isConnecting ? <div className="spinner-small" /> : <Cast size={20} />}
				{isCasting && <span className="casting-indicator" />}
			</button>

			{/* Cast device selection menu */}
			{showCastMenu && !isCasting && (
				<div className="cast-menu" onClick={(e) => e.stopPropagation()}>
					<div className="cast-menu-header">
						<span>Cast to Device</span>
						<button
							type="button"
							onClick={() => setShowCastMenu(false)}
							className="close-btn"
						>
							<X size={16} />
						</button>
					</div>

					<div className="cast-device-list">
						{availableDevices.length === 0 ? (
							<div className="no-devices">
								<Cast size={32} />
								<p>Searching for devices...</p>
							</div>
						) : (
							availableDevices.map((device) => (
								<button
									key={device.id}
									type="button"
									onClick={() => handleDeviceSelect(device)}
									className="cast-device-item"
									disabled={!device.available}
								>
									<div className="device-icon">
										{getDeviceIcon(device.type)}
									</div>
									<div className="device-info">
										<span className="device-name">{device.name}</span>
										<span className="device-type">
											{getDeviceLabel(device.type)}
										</span>
									</div>
									{device.available && (
										<div className="device-status available">
											<span className="status-dot" />
											Available
										</div>
									)}
								</button>
							))
						)}
					</div>

					<div className="cast-menu-footer">
						<p className="cast-tip">
							💡 Make sure your device is on the same Wi-Fi network
						</p>
					</div>
				</div>
			)}

			{/* Cast controls overlay */}
			{showCastControls && isCasting && currentDevice && (
				<div
					className="cast-controls-panel"
					onClick={(e) => e.stopPropagation()}
				>
					<div className="cast-controls-header">
						<div className="casting-to">
							<div className="device-icon">
								{getDeviceIcon(currentDevice.type)}
							</div>
							<div>
								<span className="casting-label">Casting to</span>
								<span className="device-name">{currentDevice.name}</span>
							</div>
						</div>
						<button
							type="button"
							onClick={handleStopCasting}
							className="stop-cast-btn"
						>
							<X size={20} />
						</button>
					</div>

					<div className="cast-controls-body">
						{/* Mock controls - in production, these would control the cast session */}
						<div className="cast-control-row">
							<button
								type="button"
								className="cast-control-btn"
								aria-label="Play/Pause"
							>
								<Play size={20} />
							</button>
							<button
								type="button"
								className="cast-control-btn"
								aria-label="Volume"
							>
								<Volume2 size={20} />
							</button>
						</div>

						<div className="cast-status">
							<div className="status-indicator casting" />
							<span>Connected</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
