import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint, Loader2, ShieldCheck, Smartphone, PenTool } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BiometricSign({ onSign, onCancel, signerName, signerType }) {
  const [name, setName] = useState("");
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState(null);
  const [biometricSupported, setBiometricSupported] = useState(true);
  const [useTypedSignature, setUseTypedSignature] = useState(false);

  useEffect(() => {
    // Check biometric support on mount
    const checkBiometricSupport = async () => {
      if (!window.PublicKeyCredential) {
        setBiometricSupported(false);
        setUseTypedSignature(true);
        return;
      }
      
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!available) {
          setBiometricSupported(false);
          setUseTypedSignature(true);
        }
      } catch (err) {
        setBiometricSupported(false);
        setUseTypedSignature(true);
      }
    };
    
    checkBiometricSupport();
  }, []);

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let device = "Unknown Device";
    
    if (/iPhone/i.test(ua)) device = "iPhone";
    else if (/iPad/i.test(ua)) device = "iPad";
    else if (/Android/i.test(ua)) device = "Android Device";
    else if (/Mac/i.test(ua)) device = "Mac";
    else if (/Windows/i.test(ua)) device = "Windows PC";
    
    return `${device} - ${new Date().toLocaleString()}`;
  };

  const handleTypedSign = async () => {
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    setSigning(true);
    setError(null);

    // Simulate a brief delay for UX
    await new Promise(resolve => setTimeout(resolve, 500));

    const deviceInfo = `${getDeviceInfo()} (Typed Signature)`;
    onSign(name, deviceInfo);
    setSigning(false);
  };

  const handleBiometricSign = async () => {
    if (!name.trim()) {
      setError("Please enter your full name");
      return;
    }

    setError(null);
    setSigning(true);

    try {
      // Check if WebAuthn is supported
      if (!window.PublicKeyCredential) {
        setBiometricSupported(false);
        setError("Biometric authentication is not supported on this device");
        setSigning(false);
        return;
      }

      // Check for platform authenticator (Face ID, Touch ID, Windows Hello, etc.)
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      if (!available) {
        setBiometricSupported(false);
        setError("No biometric authentication method found on this device");
        setSigning(false);
        return;
      }

      // Generate a challenge (in production, this should come from server)
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create credential options
      const publicKeyCredentialCreationOptions = {
        challenge: challenge,
        rp: {
          name: "GigFlow",
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: name,
          displayName: name,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },  // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
        attestation: "none",
      };

      // Prompt for biometric authentication
      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      if (credential) {
        // Success! Biometric authentication completed
        const deviceInfo = getDeviceInfo();
        onSign(name, deviceInfo);
      }
    } catch (err) {
      console.error("Biometric authentication error:", err);
      
      if (err.name === "NotAllowedError") {
        setError("Biometric authentication was cancelled or denied");
      } else if (err.name === "InvalidStateError") {
        setError("Biometric authentication already registered for this device");
        // Still allow signing in this case
        const deviceInfo = getDeviceInfo();
        onSign(name, deviceInfo);
      } else {
        setError("Biometric authentication failed. Please try again.");
      }
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="space-y-4">
      {!useTypedSignature ? (
        <>
          <Alert className="bg-violet-500/10 border-violet-500/30">
            <ShieldCheck className="h-4 w-4 text-violet-400" />
            <AlertDescription className="text-zinc-300">
              Sign this contract securely using Face ID, Touch ID, or your device's biometric authentication.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-zinc-300">Full Legal Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              disabled={signing}
            />
          </div>

          {error && (
            <Alert className="bg-rose-500/10 border-rose-500/30">
              <AlertDescription className="text-rose-300 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50">
            <div className="p-4 rounded-full bg-violet-600/20">
              <Fingerprint className="w-12 h-12 text-violet-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Biometric Signature Required</p>
              <p className="text-sm text-zinc-400 mt-1">
                Use Face ID, Touch ID, or fingerprint to sign
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={signing}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleBiometricSign}
              disabled={signing || !name.trim()}
              className="flex-1 bg-violet-600 hover:bg-violet-700 gap-2"
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4" />
                  Sign with Biometrics
                </>
              )}
            </Button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setUseTypedSignature(true)}
              className="text-xs text-zinc-400 hover:text-zinc-300 underline"
              disabled={signing}
            >
              Use typed signature instead
            </button>
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Your biometric data never leaves your device and is not stored by GigFlow
          </p>
        </>
      ) : (
        <>
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <PenTool className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-zinc-300">
              Sign this contract by typing your full legal name below.
            </AlertDescription>
          </Alert>

          <div>
            <Label className="text-zinc-300">Full Legal Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="mt-1.5 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
              disabled={signing}
            />
          </div>

          {error && (
            <Alert className="bg-rose-500/10 border-rose-500/30">
              <AlertDescription className="text-rose-300 text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col items-center gap-4 py-6 border-2 border-dashed border-zinc-700 rounded-xl bg-zinc-900/50">
            <div className="p-4 rounded-full bg-blue-600/20">
              <PenTool className="w-12 h-12 text-blue-400" />
            </div>
            <div className="text-center">
              <p className="text-white font-medium">Typed Signature</p>
              <p className="text-sm text-zinc-400 mt-1">
                Type your full legal name to sign this contract
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={signing}
              className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleTypedSign}
              disabled={signing || !name.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {signing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing...
                </>
              ) : (
                <>
                  <PenTool className="w-4 h-4" />
                  Sign Contract
                </>
              )}
            </Button>
          </div>

          {biometricSupported && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setUseTypedSignature(false)}
                className="text-xs text-zinc-400 hover:text-zinc-300 underline"
                disabled={signing}
              >
                Use biometric signature instead
              </button>
            </div>
          )}

          <p className="text-xs text-zinc-500 text-center">
            By signing, you agree that this typed signature is legally binding
          </p>
        </>
      )}
    </div>
  );
}