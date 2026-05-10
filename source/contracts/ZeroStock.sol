// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ZeroStock
 * @dev Contratto per la tracciabilità della produzione "Quiet Luxury"
 */
contract ZeroStock {
    
    // address del mio wallet dev su metamask, hardcodato per il poc
    address public constant ADMIN = 0x928a8Ed1371C55dbA06F6DFd0FAFEd5cC734Ca1a;

    // la macchina a stati (fsm). deve matchare perfettamente gli indici in react
    enum Status { Ordered, Cutting, Sewing, Shipped }

    // single source of truth dell'ordine
    struct Order {
        uint256 id;
        address customer;
        string item;
        string color;
        string size;
        Status status;
        string ipfsCid; // qui salvo solo l'hash di pinata per evitare il bloat
        uint256 timestamp;
    }

    // uso un mapping invece di un array per risparmiare gas in lettura
    mapping(uint256 => Order) public orders;
    uint256 public orderCount;

    // eventi fondamentali per far reagire l'ui e la timeline asincrona
    event OrderCreated(uint256 indexed orderId, address indexed customer);
    event StatusUpdated(uint256 indexed orderId, Status newStatus, string ipfsCid);

    // controllo accessi base (rbac)
    modifier onlyAdmin() {
        require(msg.sender == ADMIN, "Solo l'amministratore puo' eseguire questa operazione");
        _;
    }

    /**
     * @dev Crea un nuovo ordine nel sistema
     */
    function createOrder(
        address _customer,
        string memory _item,
        string memory _color,
        string memory _size
    ) public returns (uint256) {
        orderCount++;
        
        // inizializzo l'ordine. il cid all'inizio e' vuoto
        orders[orderCount] = Order({
            id: orderCount,
            customer: _customer,
            item: _item,
            color: _color,
            size: _size,
            status: Status.Ordered,
            ipfsCid: "",
            timestamp: block.timestamp
        });

        emit OrderCreated(orderCount, _customer);
        return orderCount;
    }

    /**
     * @dev Aggiorna lo stato di un ordine con prova fotografica (IPFS CID)
     */
    function updateStatus(
        uint256 _orderId,
        Status _newStatus,
        string memory _ipfsCid
    ) public onlyAdmin {
        require(_orderId > 0 && _orderId <= orderCount, "Ordine non esistente");
        
        // prendo la reference in storage per aggiornare i campi
        Order storage order = orders[_orderId];
        order.status = _newStatus;
        order.ipfsCid = _ipfsCid;
        order.timestamp = block.timestamp;

        emit StatusUpdated(_orderId, _newStatus, _ipfsCid);
    }

    /**
     * @dev Recupera i dettagli di un ordine
     */
    function getOrder(uint256 _orderId) public view returns (Order memory) {
        return orders[_orderId];
    }
}