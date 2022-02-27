const OriShare = artifacts.require("OriShare");
const OriToken = artifacts.require("OriToken");

module.exports = function(deployer) {
  deployer.deploy(OriToken, "0xECF5A576A949aEE5915Afb60E0e62D09825Cd61B", "ORI", "ORI", 5, 750000000000)
      .then(() => OriToken.deployed())
      .then(_instance => deployer.deploy(OriShare, _instance.address));
};
