{ vox ? { outPath = ./.; name = "vox"; }
, pkgs ? import <nixpkgs> {}
}:
let
  nodePackages = import "${pkgs.path}/pkgs/top-level/node-packages.nix" {
    inherit pkgs;
    inherit (pkgs) stdenv nodejs fetchurl fetchgit;
    neededNatives = [ pkgs.python ] ++ pkgs.lib.optional pkgs.stdenv.isLinux pkgs.utillinux;
    self = nodePackages;

    # npm2nix needs some help with this one.
    overrides.canvas = {
      patchPhase = ''
        substituteInPlace util/has_lib.sh --replace '#!/bin/bash' '#!${pkgs.bash}/bin/bash'
      '';
      buildInputs = [
        pkgs.pkgconfig
        pkgs.cairo
        pkgs.freetype
        pkgs.libjpeg
        pkgs.giflib
      ];
    };
    generated = ./vox.generated.nix;
  };
in rec {
  tarball = pkgs.runCommand "vox-0.0.1.tgz" { buildInputs = [ pkgs.nodejs ]; } ''
    mv `HOME=$PWD npm pack ${vox}` $out
  '';
  build = nodePackages.buildNodePackage {
    name = "vox-0.0.1";
    src = [ tarball ];
    buildInputs = nodePackages.nativeDeps."vox" or [];
    deps = [ nodePackages.by-spec."body-parser"."~1.8.1" nodePackages.by-spec."capitalize"."^0.5.0" nodePackages.by-spec."cookie-parser"."~1.3.3" nodePackages.by-spec."debug"."~2.0.0" nodePackages.by-spec."express"."~4.9.0" nodePackages.by-spec."identicon"."~2.0.1" nodePackages.by-spec."jade"."~1.6.0" nodePackages.by-spec."moniker"."^0.1.2" nodePackages.by-spec."morgan"."~1.3.0" nodePackages.by-spec."sanitizer"."~0.1.2" nodePackages.by-spec."serve-favicon"."~2.1.3" nodePackages.by-spec."socket.io"."~1.4.0" nodePackages.by-spec."socket.io-events"."^0.4.6" nodePackages.by-spec."underscore"."~1.7.0" ];
    peerDependencies = [];
    passthru.names = [ "vox" ];
  };
}
