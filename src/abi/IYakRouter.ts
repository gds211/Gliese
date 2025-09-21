const IYakRouter = [
  {
    type:'function', name:'findBestPathWithGas', stateMutability:'view',
    inputs:[
      {name:'amountIn', type:'uint256'},
      {name:'tokenIn',  type:'address'},
      {name:'tokenOut', type:'address'},
      {name:'maxSteps', type:'uint256'},
      {name:'gasPrice', type:'uint256'}
    ],
    outputs:[
      {name:'amounts',     type:'uint256[]'},
      {name:'adapters',    type:'address[]'},
      {name:'path',        type:'address[]'},
      {name:'gasEstimate', type:'uint256'}
    ]
  },
  {
    type:'function', name:'swapNoSplit', stateMutability:'payable',
    inputs:[
      {name:'amountIn',     type:'uint256'},
      {name:'amountOutMin', type:'uint256'},
      {name:'path',         type:'address[]'},
      {name:'adapters',     type:'address[]'},
      {name:'recipient',    type:'address'},
      {name:'deadline',     type:'uint256'}
    ],
    outputs:[{type:'uint256'}]
  }
] as const;

export default IYakRouter;