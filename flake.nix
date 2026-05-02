{
  description = "corgi";
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };
  outputs = {
    self,
    nixpkgs,
    ...
  }: let
    systems = nixpkgs.lib.platforms.unix;
    forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f system);
  in {
    packages = forAllSystems (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {
        bazelisk = pkgs.bazelisk;
        buildifier = pkgs.buildifier;
        neovim = pkgs.neovim;
        nodejs = pkgs.nodejs-slim_22;
        pnpm = pkgs.pnpm;
      });
    devShells = forAllSystems (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        packages = builtins.attrValues self.packages.${system};
      in {
        default = pkgs.mkShell {
          packages = packages;
          shellHook = ''
            alias bazel=bazelisk
            alias vim=nvim

            # Forgive me
            export HISTFILESIZE=
            export HISTSIZE=
            export PS1="\[\033[1;32m\][esc:\w]\$\[\033[0m\] "
          '';
        };
      });
  };
}
