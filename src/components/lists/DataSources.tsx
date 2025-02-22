import { AddIcon } from "@chakra-ui/icons";
import {
    Button,
    Spacer,
    Stack,
    Table,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tr,
} from "@chakra-ui/react";
import { useDataEngine } from "@dhis2/app-runtime";
import { Link, useNavigate } from "@tanstack/react-location";
import { useStore } from "effector-react";
import { useEffect, useState } from "react";
import { IDataSource, LocationGenerics } from "../../interfaces";
import { deleteDocument, useDataSources } from "../../Queries";
import { $settings, $store } from "../../Store";
import { generateUid } from "../../utils/uid";
import LoadingIndicator from "../LoadingIndicator";
const DataSources = () => {
    const navigate = useNavigate<LocationGenerics>();
    const [loading, setLoading] = useState<boolean>(false);
    const store = useStore($store);
    const { storage } = useStore($settings);
    const engine = useDataEngine();
    const [currentId, setCurrentId] = useState<string>("");
    const { isLoading, isSuccess, isError, error, data } = useDataSources(
        storage,
        store.systemId
    );
    const [response, setResponse] = useState<IDataSource[] | undefined>(data);
    const deleteDataSource = async (id: string) => {
        setCurrentId(() => id);
        setLoading(() => true);
        await deleteDocument(storage, "i-data-sources", id, engine);
        setResponse((prev) => prev?.filter((p) => p.id !== id));
        setLoading(() => false);
    };

    useEffect(() => {
        setResponse(() => data);
    }, [data]);

    return (
        <Stack>
            <Stack direction="row" border="1">
                <Text fontSize="2xl" fontWeight="bold" p="2" color="blue.600">
                    Data Sources
                </Text>
                <Spacer />
                <Button
                    colorScheme="blue"
                    onClick={() =>
                        navigate({
                            to: `/settings/data-sources/${generateUid()}`,
                            search: { action: "create" },
                        })
                    }
                >
                    <AddIcon mr="2" />
                    Add Data Source
                </Button>
            </Stack>
            <Stack
                justifyItems="center"
                alignContent="center"
                alignItems="center"
                flex={1}
            >
                {isLoading && <LoadingIndicator />}
                {isSuccess && (
                    <Table variant="striped" w="100%">
                        <Thead>
                            <Tr>
                                <Th>Name</Th>
                                <Th>Description</Th>
                                <Th>Actions</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {response?.map((dataSource: IDataSource) => (
                                <Tr key={dataSource.id}>
                                    <Td>
                                        <Link<LocationGenerics>
                                            to={`/settings/data-sources/${dataSource.id}`}
                                            search={{ action: "update" }}
                                        >
                                            {dataSource.name}
                                        </Link>
                                    </Td>
                                    <Td>{dataSource.description}</Td>
                                    <Td>
                                        <Stack direction="row" spacing="5px">
                                            <Button size="xs">Duplicate</Button>
                                            <Button
                                                colorScheme="red"
                                                size="xs"
                                                isLoading={
                                                    loading &&
                                                    currentId === dataSource.id
                                                }
                                                onClick={() =>
                                                    deleteDataSource(
                                                        dataSource.id
                                                    )
                                                }
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </Td>
                                </Tr>
                            ))}
                        </Tbody>
                    </Table>
                )}
                {isError && <Text>No data/Error occurred</Text>}
            </Stack>
        </Stack>
    );
};

export default DataSources;
