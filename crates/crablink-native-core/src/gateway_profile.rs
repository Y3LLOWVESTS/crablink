//! RO:WHAT — Pure gateway environment-profile and host-posture validation.
//! RO:WHY — Native clients must share release-host and private-LAN rules without duplicating them.
//! RO:INTERACTS — TV gateway profile review and future native gateway adapters.
//! RO:INVARIANTS — exact profile labels; no release loopback; development uses private LAN hosts only.
//! RO:SECURITY — address parsing only; no DNS lookup, sockets, HTTP, storage, wallet, ledger, or finality.
//! RO:TEST — focused profile, IPv4, mDNS, IPv6 ULA, and link-local tests below.

#![forbid(unsafe_code)]

use std::net::{IpAddr, Ipv6Addr};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum GatewayEnvironmentProfile {
    ReleaseHttps,
    DevelopmentLan,
}

impl GatewayEnvironmentProfile {
    pub fn from_label(value: &str) -> Result<Self, &'static str> {
        match value {
            "release-https" => Ok(Self::ReleaseHttps),
            "development-lan" => Ok(Self::DevelopmentLan),
            _ => Err("gateway_profile_unsupported"),
        }
    }

    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::ReleaseHttps => "release-https",
            Self::DevelopmentLan => "development-lan",
        }
    }
}

#[must_use]
pub fn is_loopback_or_unspecified_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return true;
    }

    let Ok(address) = host.parse::<IpAddr>() else {
        return false;
    };

    address.is_loopback() || address.is_unspecified()
}

#[must_use]
pub fn is_ipv6_unicast_link_local(address: Ipv6Addr) -> bool {
    address.segments()[0] & 0xffc0 == 0xfe80
}

#[must_use]
pub fn is_private_lan_host(host: &str) -> bool {
    if host.eq_ignore_ascii_case("localhost") {
        return false;
    }

    if host.to_ascii_lowercase().ends_with(".local") {
        return true;
    }

    let Ok(address) = host.parse::<IpAddr>() else {
        return false;
    };

    match address {
        IpAddr::V4(address) => {
            address.is_private() && !address.is_loopback() && !address.is_unspecified()
        }

        IpAddr::V6(address) => {
            let first_segment = address.segments()[0];

            let unique_local = first_segment & 0xfe00 == 0xfc00;

            (unique_local || is_ipv6_unicast_link_local(address))
                && !address.is_loopback()
                && !address.is_unspecified()
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{
        is_ipv6_unicast_link_local, is_loopback_or_unspecified_host, is_private_lan_host,
        GatewayEnvironmentProfile,
    };

    #[test]
    fn gateway_profile_labels_are_exact() {
        assert_eq!(
            GatewayEnvironmentProfile::from_label("release-https",),
            Ok(GatewayEnvironmentProfile::ReleaseHttps,),
        );

        assert_eq!(
            GatewayEnvironmentProfile::from_label("development-lan",),
            Ok(GatewayEnvironmentProfile::DevelopmentLan,),
        );

        for invalid in [
            "",
            "release",
            "development",
            "Release-Https",
            "development_lan",
        ] {
            assert_eq!(
                GatewayEnvironmentProfile::from_label(invalid,),
                Err("gateway_profile_unsupported",),
            );
        }
    }

    #[test]
    fn private_ipv4_and_mdns_hosts_are_accepted() {
        for host in [
            "10.1.2.3",
            "172.16.1.2",
            "172.31.255.254",
            "192.168.1.50",
            "gateway.local",
            "GATEWAY.LOCAL",
        ] {
            assert!(is_private_lan_host(host), "{host} must be private LAN",);
        }
    }

    #[test]
    fn loopback_unspecified_and_public_hosts_reject() {
        for host in [
            "localhost",
            "127.0.0.1",
            "0.0.0.0",
            "::",
            "::1",
            "8.8.8.8",
            "gateway.example",
        ] {
            assert!(!is_private_lan_host(host), "{host} must not be private LAN",);
        }

        for host in ["localhost", "127.0.0.1", "0.0.0.0", "::", "::1"] {
            assert!(
                is_loopback_or_unspecified_host(host,),
                "{host} must be blocked",
            );
        }
    }

    #[test]
    fn ipv6_unique_local_and_link_local_hosts_are_accepted() {
        for host in [
            "fc00::1",
            "fd12:3456:789a::1",
            "fe80::1",
            "fe9f::1",
            "febf:ffff::1",
        ] {
            assert!(is_private_lan_host(host), "{host} must be private LAN",);
        }
    }

    #[test]
    fn ipv6_link_local_prefix_boundary_is_exact() {
        for raw in ["fe80::1", "fe9f::1", "febf:ffff::1"] {
            let address = raw.parse().expect("valid link-local fixture");

            assert!(
                is_ipv6_unicast_link_local(address,),
                "{raw} must be in fe80::/10",
            );
        }

        for raw in ["fe7f::1", "fec0::1", "feff::1", "2001:db8::1"] {
            let address = raw.parse().expect("valid non-link-local fixture");

            assert!(
                !is_ipv6_unicast_link_local(address,),
                "{raw} must be outside fe80::/10",
            );

            assert!(!is_private_lan_host(raw), "{raw} must not be private LAN",);
        }
    }
}
