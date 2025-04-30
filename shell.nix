{
  pkgs ? import (fetchTarball "https://github.com/NixOS/nixpkgs/archive/29335f23bea5e34228349ea739f31ee79e267b88.tar.gz") {
    config.allowUnfree = true;
  }
}:

pkgs.mkShell {
  buildInputs = with pkgs; [
    bazelisk
    buildifier
    neovim
    nodePackages.pnpm
    nodejs-slim_22
  ];

  shellHook = ''
    alias bazel=bazelisk
    alias vim=nvim

    # Forgive me
    export HISTFILESIZE=
    export HISTSIZE=
    export PS1="\[\033[1;32m\][esc:\w]\$\[\033[0m\] "
  '';
}
