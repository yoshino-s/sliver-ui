package gateway

import (
	"context"
	"io"
	"sync"

	"connectrpc.com/connect"
	"github.com/bishopfox/sliver/protobuf/clientpb"
	"github.com/bishopfox/sliver/protobuf/commonpb"
	"github.com/bishopfox/sliver/protobuf/sliverpb"
)

type SliverRPCProxy struct {
	store *SessionStore
}

func NewSliverRPCProxy(store *SessionStore) *SliverRPCProxy {
	return &SliverRPCProxy{store: store}
}

func (p *SliverRPCProxy) GetVersion(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Version], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetVersion(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetOperators(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Operators], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetOperators(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Kill(ctx context.Context, req *connect.Request[sliverpb.KillReq]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Kill(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Reconfigure(ctx context.Context, req *connect.Request[sliverpb.ReconfigureReq]) (*connect.Response[sliverpb.Reconfigure], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Reconfigure(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Rename(ctx context.Context, req *connect.Request[clientpb.RenameReq]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Rename(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetSessions(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Sessions], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetSessions(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetBeacons(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Beacons], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetBeacons(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetBeacon(ctx context.Context, req *connect.Request[clientpb.Beacon]) (*connect.Response[clientpb.Beacon], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetBeacon(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RmBeacon(ctx context.Context, req *connect.Request[clientpb.Beacon]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RmBeacon(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetBeaconTasks(ctx context.Context, req *connect.Request[clientpb.Beacon]) (*connect.Response[clientpb.BeaconTasks], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetBeaconTasks(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetBeaconTaskContent(ctx context.Context, req *connect.Request[clientpb.BeaconTask]) (*connect.Response[clientpb.BeaconTask], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetBeaconTaskContent(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) MonitorStart(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[commonpb.Response], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.MonitorStart(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) MonitorStop(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.MonitorStop(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetJobs(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Jobs], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetJobs(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) KillJob(ctx context.Context, req *connect.Request[clientpb.KillJobReq]) (*connect.Response[clientpb.KillJob], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.KillJob(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartMTLSListener(ctx context.Context, req *connect.Request[clientpb.MTLSListenerReq]) (*connect.Response[clientpb.MTLSListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartMTLSListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartWGListener(ctx context.Context, req *connect.Request[clientpb.WGListenerReq]) (*connect.Response[clientpb.WGListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartWGListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartDNSListener(ctx context.Context, req *connect.Request[clientpb.DNSListenerReq]) (*connect.Response[clientpb.DNSListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartDNSListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartHTTPSListener(ctx context.Context, req *connect.Request[clientpb.HTTPListenerReq]) (*connect.Response[clientpb.HTTPListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartHTTPSListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartHTTPListener(ctx context.Context, req *connect.Request[clientpb.HTTPListenerReq]) (*connect.Response[clientpb.HTTPListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartHTTPListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartTCPStagerListener(ctx context.Context, req *connect.Request[clientpb.StagerListenerReq]) (*connect.Response[clientpb.StagerListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartTCPStagerListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartHTTPStagerListener(ctx context.Context, req *connect.Request[clientpb.StagerListenerReq]) (*connect.Response[clientpb.StagerListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartHTTPStagerListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootAdd(ctx context.Context, req *connect.Request[clientpb.Loot]) (*connect.Response[clientpb.Loot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootAdd(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootRm(ctx context.Context, req *connect.Request[clientpb.Loot]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootRm(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootUpdate(ctx context.Context, req *connect.Request[clientpb.Loot]) (*connect.Response[clientpb.Loot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootUpdate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootContent(ctx context.Context, req *connect.Request[clientpb.Loot]) (*connect.Response[clientpb.Loot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootContent(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootAll(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.AllLoot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootAll(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) LootAllOf(ctx context.Context, req *connect.Request[clientpb.Loot]) (*connect.Response[clientpb.AllLoot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.LootAllOf(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Hosts(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.AllHosts], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Hosts(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Host(ctx context.Context, req *connect.Request[clientpb.Host]) (*connect.Response[clientpb.Host], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Host(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) HostRm(ctx context.Context, req *connect.Request[clientpb.Host]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.HostRm(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) HostIOCRm(ctx context.Context, req *connect.Request[clientpb.IOC]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.HostIOCRm(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Generate(ctx context.Context, req *connect.Request[clientpb.GenerateReq]) (*connect.Response[clientpb.Generate], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Generate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Regenerate(ctx context.Context, req *connect.Request[clientpb.RegenerateReq]) (*connect.Response[clientpb.Generate], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Regenerate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ImplantBuilds(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.ImplantBuilds], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ImplantBuilds(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) DeleteImplantBuild(ctx context.Context, req *connect.Request[clientpb.DeleteReq]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.DeleteImplantBuild(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Canaries(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Canaries], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Canaries(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GenerateWGClientConfig(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.WGClientConfig], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GenerateWGClientConfig(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GenerateUniqueIP(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.UniqueWGIP], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GenerateUniqueIP(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ImplantProfiles(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.ImplantProfiles], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ImplantProfiles(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) DeleteImplantProfile(ctx context.Context, req *connect.Request[clientpb.DeleteReq]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.DeleteImplantProfile(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) SaveImplantProfile(ctx context.Context, req *connect.Request[clientpb.ImplantProfile]) (*connect.Response[clientpb.ImplantProfile], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.SaveImplantProfile(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) MsfStage(ctx context.Context, req *connect.Request[clientpb.MsfStagerReq]) (*connect.Response[clientpb.MsfStager], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.MsfStage(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ShellcodeRDI(ctx context.Context, req *connect.Request[clientpb.ShellcodeRDIReq]) (*connect.Response[clientpb.ShellcodeRDI], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ShellcodeRDI(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetCompiler(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Compiler], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetCompiler(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Websites(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.Websites], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Websites(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Website(ctx context.Context, req *connect.Request[clientpb.Website]) (*connect.Response[clientpb.Website], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Website(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WebsiteRemove(ctx context.Context, req *connect.Request[clientpb.Website]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WebsiteRemove(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WebsiteAddContent(ctx context.Context, req *connect.Request[clientpb.WebsiteAddContent]) (*connect.Response[clientpb.Website], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WebsiteAddContent(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WebsiteUpdateContent(ctx context.Context, req *connect.Request[clientpb.WebsiteAddContent]) (*connect.Response[clientpb.Website], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WebsiteUpdateContent(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WebsiteRemoveContent(ctx context.Context, req *connect.Request[clientpb.WebsiteRemoveContent]) (*connect.Response[clientpb.Website], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WebsiteRemoveContent(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Ping(ctx context.Context, req *connect.Request[sliverpb.Ping]) (*connect.Response[sliverpb.Ping], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Ping(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Ps(ctx context.Context, req *connect.Request[sliverpb.PsReq]) (*connect.Response[sliverpb.Ps], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Ps(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Terminate(ctx context.Context, req *connect.Request[sliverpb.TerminateReq]) (*connect.Response[sliverpb.Terminate], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Terminate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Ifconfig(ctx context.Context, req *connect.Request[sliverpb.IfconfigReq]) (*connect.Response[sliverpb.Ifconfig], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Ifconfig(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Netstat(ctx context.Context, req *connect.Request[sliverpb.NetstatReq]) (*connect.Response[sliverpb.Netstat], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Netstat(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Ls(ctx context.Context, req *connect.Request[sliverpb.LsReq]) (*connect.Response[sliverpb.Ls], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Ls(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Cd(ctx context.Context, req *connect.Request[sliverpb.CdReq]) (*connect.Response[sliverpb.Pwd], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Cd(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Pwd(ctx context.Context, req *connect.Request[sliverpb.PwdReq]) (*connect.Response[sliverpb.Pwd], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Pwd(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Mv(ctx context.Context, req *connect.Request[sliverpb.MvReq]) (*connect.Response[sliverpb.Mv], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Mv(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Rm(ctx context.Context, req *connect.Request[sliverpb.RmReq]) (*connect.Response[sliverpb.Rm], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Rm(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Mkdir(ctx context.Context, req *connect.Request[sliverpb.MkdirReq]) (*connect.Response[sliverpb.Mkdir], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Mkdir(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Download(ctx context.Context, req *connect.Request[sliverpb.DownloadReq]) (*connect.Response[sliverpb.Download], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Download(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Upload(ctx context.Context, req *connect.Request[sliverpb.UploadReq]) (*connect.Response[sliverpb.Upload], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Upload(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ProcessDump(ctx context.Context, req *connect.Request[sliverpb.ProcessDumpReq]) (*connect.Response[sliverpb.ProcessDump], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ProcessDump(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RunAs(ctx context.Context, req *connect.Request[sliverpb.RunAsReq]) (*connect.Response[sliverpb.RunAs], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RunAs(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Impersonate(ctx context.Context, req *connect.Request[sliverpb.ImpersonateReq]) (*connect.Response[sliverpb.Impersonate], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Impersonate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RevToSelf(ctx context.Context, req *connect.Request[sliverpb.RevToSelfReq]) (*connect.Response[sliverpb.RevToSelf], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RevToSelf(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetSystem(ctx context.Context, req *connect.Request[clientpb.GetSystemReq]) (*connect.Response[sliverpb.GetSystem], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetSystem(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Task(ctx context.Context, req *connect.Request[sliverpb.TaskReq]) (*connect.Response[sliverpb.Task], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Task(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Msf(ctx context.Context, req *connect.Request[clientpb.MSFReq]) (*connect.Response[sliverpb.Task], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Msf(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) MsfRemote(ctx context.Context, req *connect.Request[clientpb.MSFRemoteReq]) (*connect.Response[sliverpb.Task], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.MsfRemote(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ExecuteAssembly(ctx context.Context, req *connect.Request[sliverpb.ExecuteAssemblyReq]) (*connect.Response[sliverpb.ExecuteAssembly], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ExecuteAssembly(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Migrate(ctx context.Context, req *connect.Request[clientpb.MigrateReq]) (*connect.Response[sliverpb.Migrate], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Migrate(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Execute(ctx context.Context, req *connect.Request[sliverpb.ExecuteReq]) (*connect.Response[sliverpb.Execute], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Execute(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ExecuteToken(ctx context.Context, req *connect.Request[sliverpb.ExecuteTokenReq]) (*connect.Response[sliverpb.Execute], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ExecuteToken(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Sideload(ctx context.Context, req *connect.Request[sliverpb.SideloadReq]) (*connect.Response[sliverpb.Sideload], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Sideload(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) SpawnDll(ctx context.Context, req *connect.Request[sliverpb.InvokeSpawnDllReq]) (*connect.Response[sliverpb.SpawnDll], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.SpawnDll(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Screenshot(ctx context.Context, req *connect.Request[sliverpb.ScreenshotReq]) (*connect.Response[sliverpb.Screenshot], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Screenshot(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CurrentTokenOwner(ctx context.Context, req *connect.Request[sliverpb.CurrentTokenOwnerReq]) (*connect.Response[sliverpb.CurrentTokenOwner], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CurrentTokenOwner(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) PivotStartListener(ctx context.Context, req *connect.Request[sliverpb.PivotStartListenerReq]) (*connect.Response[sliverpb.PivotListener], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.PivotStartListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) PivotStopListener(ctx context.Context, req *connect.Request[sliverpb.PivotStopListenerReq]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.PivotStopListener(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) PivotSessionListeners(ctx context.Context, req *connect.Request[sliverpb.PivotListenersReq]) (*connect.Response[sliverpb.PivotListeners], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.PivotSessionListeners(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) PivotGraph(ctx context.Context, req *connect.Request[commonpb.Empty]) (*connect.Response[clientpb.PivotGraph], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.PivotGraph(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StartService(ctx context.Context, req *connect.Request[sliverpb.StartServiceReq]) (*connect.Response[sliverpb.ServiceInfo], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StartService(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) StopService(ctx context.Context, req *connect.Request[sliverpb.StopServiceReq]) (*connect.Response[sliverpb.ServiceInfo], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.StopService(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RemoveService(ctx context.Context, req *connect.Request[sliverpb.RemoveServiceReq]) (*connect.Response[sliverpb.ServiceInfo], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RemoveService(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) MakeToken(ctx context.Context, req *connect.Request[sliverpb.MakeTokenReq]) (*connect.Response[sliverpb.MakeToken], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.MakeToken(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetEnv(ctx context.Context, req *connect.Request[sliverpb.EnvReq]) (*connect.Response[sliverpb.EnvInfo], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetEnv(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) SetEnv(ctx context.Context, req *connect.Request[sliverpb.SetEnvReq]) (*connect.Response[sliverpb.SetEnv], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.SetEnv(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) UnsetEnv(ctx context.Context, req *connect.Request[sliverpb.UnsetEnvReq]) (*connect.Response[sliverpb.UnsetEnv], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.UnsetEnv(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Backdoor(ctx context.Context, req *connect.Request[sliverpb.BackdoorReq]) (*connect.Response[sliverpb.Backdoor], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Backdoor(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryRead(ctx context.Context, req *connect.Request[sliverpb.RegistryReadReq]) (*connect.Response[sliverpb.RegistryRead], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryRead(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryWrite(ctx context.Context, req *connect.Request[sliverpb.RegistryWriteReq]) (*connect.Response[sliverpb.RegistryWrite], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryWrite(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryCreateKey(ctx context.Context, req *connect.Request[sliverpb.RegistryCreateKeyReq]) (*connect.Response[sliverpb.RegistryCreateKey], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryCreateKey(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryDeleteKey(ctx context.Context, req *connect.Request[sliverpb.RegistryDeleteKeyReq]) (*connect.Response[sliverpb.RegistryDeleteKey], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryDeleteKey(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryListSubKeys(ctx context.Context, req *connect.Request[sliverpb.RegistrySubKeyListReq]) (*connect.Response[sliverpb.RegistrySubKeyList], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryListSubKeys(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegistryListValues(ctx context.Context, req *connect.Request[sliverpb.RegistryListValuesReq]) (*connect.Response[sliverpb.RegistryValuesList], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegistryListValues(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RunSSHCommand(ctx context.Context, req *connect.Request[sliverpb.SSHCommandReq]) (*connect.Response[sliverpb.SSHCommand], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RunSSHCommand(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) HijackDLL(ctx context.Context, req *connect.Request[clientpb.DllHijackReq]) (*connect.Response[clientpb.DllHijack], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.HijackDLL(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) GetPrivs(ctx context.Context, req *connect.Request[sliverpb.GetPrivsReq]) (*connect.Response[sliverpb.GetPrivs], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.GetPrivs(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) OpenSession(ctx context.Context, req *connect.Request[sliverpb.OpenSession]) (*connect.Response[sliverpb.OpenSession], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.OpenSession(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CloseSession(ctx context.Context, req *connect.Request[sliverpb.CloseSession]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CloseSession(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) RegisterExtension(ctx context.Context, req *connect.Request[sliverpb.RegisterExtensionReq]) (*connect.Response[sliverpb.RegisterExtension], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.RegisterExtension(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CallExtension(ctx context.Context, req *connect.Request[sliverpb.CallExtensionReq]) (*connect.Response[sliverpb.CallExtension], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CallExtension(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) ListExtensions(ctx context.Context, req *connect.Request[sliverpb.ListExtensionsReq]) (*connect.Response[sliverpb.ListExtensions], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.ListExtensions(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGStartPortForward(ctx context.Context, req *connect.Request[sliverpb.WGPortForwardStartReq]) (*connect.Response[sliverpb.WGPortForward], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGStartPortForward(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGStopPortForward(ctx context.Context, req *connect.Request[sliverpb.WGPortForwardStopReq]) (*connect.Response[sliverpb.WGPortForward], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGStopPortForward(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGStartSocks(ctx context.Context, req *connect.Request[sliverpb.WGSocksStartReq]) (*connect.Response[sliverpb.WGSocks], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGStartSocks(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGStopSocks(ctx context.Context, req *connect.Request[sliverpb.WGSocksStopReq]) (*connect.Response[sliverpb.WGSocks], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGStopSocks(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGListForwarders(ctx context.Context, req *connect.Request[sliverpb.WGTCPForwardersReq]) (*connect.Response[sliverpb.WGTCPForwarders], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGListForwarders(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) WGListSocksServers(ctx context.Context, req *connect.Request[sliverpb.WGSocksServersReq]) (*connect.Response[sliverpb.WGSocksServers], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.WGListSocksServers(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Shell(ctx context.Context, req *connect.Request[sliverpb.ShellReq]) (*connect.Response[sliverpb.Shell], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Shell(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Portfwd(ctx context.Context, req *connect.Request[sliverpb.PortfwdReq]) (*connect.Response[sliverpb.Portfwd], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.Portfwd(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CreateSocks(ctx context.Context, req *connect.Request[sliverpb.Socks]) (*connect.Response[sliverpb.Socks], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CreateSocks(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CloseSocks(ctx context.Context, req *connect.Request[sliverpb.Socks]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CloseSocks(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CreateTunnel(ctx context.Context, req *connect.Request[sliverpb.Tunnel]) (*connect.Response[sliverpb.Tunnel], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CreateTunnel(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) CloseTunnel(ctx context.Context, req *connect.Request[sliverpb.Tunnel]) (*connect.Response[commonpb.Empty], error) {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return nil, err
	}
	resp, err := client.CloseTunnel(ctx, req.Msg)
	if err != nil {
		return nil, err
	}
	return connect.NewResponse(resp), nil
}

func (p *SliverRPCProxy) Events(ctx context.Context, req *connect.Request[commonpb.Empty], stream *connect.ServerStream[clientpb.Event]) error {
	client, err := p.store.ClientFromHeader(req.Header())
	if err != nil {
		return err
	}
	grpcStream, err := client.Events(ctx, req.Msg)
	if err != nil {
		return err
	}
	for {
		msg, err := grpcStream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return err
		}
		if err := stream.Send(msg); err != nil {
			return err
		}
	}
}

func (p *SliverRPCProxy) SocksProxy(ctx context.Context, stream *connect.BidiStream[sliverpb.SocksData, sliverpb.SocksData]) error {
	client, err := p.store.ClientFromHeader(stream.RequestHeader())
	if err != nil {
		return err
	}
	grpcStream, err := client.SocksProxy(ctx)
	if err != nil {
		return err
	}
	errCh := make(chan error, 2)
	var once sync.Once

	go func() {
		for {
			msg, err := stream.Receive()
			if err == io.EOF {
				once.Do(func() { _ = grpcStream.CloseSend() })
				errCh <- nil
				return
			}
			if err != nil {
				errCh <- err
				return
			}
			if err := grpcStream.Send(msg); err != nil {
				errCh <- err
				return
			}
		}
	}()

	go func() {
		for {
			msg, err := grpcStream.Recv()
			if err == io.EOF {
				errCh <- nil
				return
			}
			if err != nil {
				errCh <- err
				return
			}
			if err := stream.Send(msg); err != nil {
				errCh <- err
				return
			}
		}
	}()

	for i := 0; i < 2; i++ {
		if err := <-errCh; err != nil {
			once.Do(func() { _ = grpcStream.CloseSend() })
			return err
		}
	}
	return nil
}

func (p *SliverRPCProxy) TunnelData(ctx context.Context, stream *connect.BidiStream[sliverpb.TunnelData, sliverpb.TunnelData]) error {
	client, err := p.store.ClientFromHeader(stream.RequestHeader())
	if err != nil {
		return err
	}
	grpcStream, err := client.TunnelData(ctx)
	if err != nil {
		return err
	}
	errCh := make(chan error, 2)
	var once sync.Once

	go func() {
		for {
			msg, err := stream.Receive()
			if err == io.EOF {
				once.Do(func() { _ = grpcStream.CloseSend() })
				errCh <- nil
				return
			}
			if err != nil {
				errCh <- err
				return
			}
			if err := grpcStream.Send(msg); err != nil {
				errCh <- err
				return
			}
		}
	}()

	go func() {
		for {
			msg, err := grpcStream.Recv()
			if err == io.EOF {
				errCh <- nil
				return
			}
			if err != nil {
				errCh <- err
				return
			}
			if err := stream.Send(msg); err != nil {
				errCh <- err
				return
			}
		}
	}()

	for i := 0; i < 2; i++ {
		if err := <-errCh; err != nil {
			once.Do(func() { _ = grpcStream.CloseSend() })
			return err
		}
	}
	return nil
}
